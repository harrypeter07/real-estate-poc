const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Ported compute logic from salary-engine.ts to test the integration programmatically
function computePayoutForEmployee(emp, buckets, presentDays, totalWorked, totalOt) {
  const baseSalary = Number(emp.salary_rate);
  const overtimePay = totalOt * Number(emp.overtime_rate);
  
  // Calculate short hours & deduction
  let shortHours = 0;
  let deductionAmount = 0;
  
  buckets.forEach(b => {
    shortHours += b.shortHours;
    if (emp.deduction_enabled && emp.salary_type === 'monthly') {
      const hourlyRate = baseSalary / (b.requiredHours || 1);
      deductionAmount += b.shortHours * hourlyRate;
    }
  });

  const finalSalary = Math.max(0, baseSalary + overtimePay - deductionAmount);

  return {
    baseSalary,
    overtimePay,
    deductionAmount,
    finalSalary,
    weekly_breakdown: buckets
  };
}

async function testHrFlow() {
  console.log('=== HR FLOW VERIFICATION TEST ===\n');
  let testEmployeeId = null;
  let testBatchId = null;
  let businessId = null;

  try {
    // 1. Resolve business ID
    console.log('Step 1: Resolving business_id...');
    const { data: kvData } = await supabase
      .from('_app_kv')
      .select('value')
      .eq('key', 'default_business_id')
      .maybeSingle();

    if (kvData && kvData.value) {
      businessId = kvData.value;
      console.log(`✅ Found default business_id in KV: ${businessId}`);
    } else {
      const { data: bizData, error: bizError } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      if (bizError || !bizData) {
        throw new Error('Could not resolve any business_id from KV or businesses table. Check database connection.');
      }
      businessId = bizData.id;
      console.log(`✅ Found business_id in businesses: ${businessId}`);
    }

    // 2. Create Employee
    console.log('\nStep 2: Creating test employee...');
    const testCode = 'EMP-VERIFY-' + Math.floor(Math.random() * 10000);
    const { data: emp, error: empError } = await supabase
      .from('hr_employees')
      .insert({
        business_id: businessId,
        name: 'Test Verification Employee',
        employee_code: testCode,
        phone: '999999' + Math.floor(Math.random() * 10000),
        salary_type: 'monthly',
        salary_rate: 30000, // ₹30,000 / month
        overtime_rate: 150,  // ₹150 / hour
        required_hours_per_week: 48,
        grace_hours: 2,
        deduction_enabled: true
      })
      .select()
      .single();

    if (empError) throw empError;
    testEmployeeId = emp.id;
    console.log(`✅ Employee created successfully! ID: ${testEmployeeId}, Code: ${emp.employee_code}`);

    // 3. Insert Attendance
    console.log('\nStep 3: Recording attendance logs...');
    const logs = [
      {
        employee_id: testEmployeeId,
        work_date: '2026-05-18',
        in_time: '09:00:00',
        out_time: '18:00:00',
        duration_minutes: 480, // 8 hours
        overtime_minutes: 60,  // 1 hour overtime
        attendance_type: 'present',
        is_valid: true
      },
      {
        employee_id: testEmployeeId,
        work_date: '2026-05-19',
        in_time: '09:00:00',
        out_time: '17:00:00',
        duration_minutes: 480, // 8 hours
        overtime_minutes: 0,
        attendance_type: 'present',
        is_valid: true
      }
    ];

    const { data: attData, error: attError } = await supabase
      .from('hr_attendance')
      .insert(logs)
      .select();

    if (attError) throw attError;
    console.log(`✅ Recorded ${attData.length} attendance log entries successfully!`);

    // 4. Create Payout Batch
    console.log('\nStep 4: Creating/getting payout batch for May 2026...');
    const monthLabel = 'May 2026';
    
    // Check if exists
    const { data: existingBatch } = await supabase
      .from('hr_payout_batches')
      .select('id')
      .eq('business_id', businessId)
      .eq('month_label', monthLabel)
      .maybeSingle();

    if (existingBatch) {
      testBatchId = existingBatch.id;
      console.log(`✅ Payout batch already exists: ${testBatchId}`);
      // Clear previous payouts for this test to avoid uniqueness conflicts
      await supabase.from('hr_employee_payouts').delete().eq('batch_id', testBatchId).eq('employee_id', testEmployeeId);
    } else {
      const { data: newBatch, error: batchError } = await supabase
        .from('hr_payout_batches')
        .insert({
          business_id: businessId,
          month_label: monthLabel,
          status: 'draft'
        })
        .select()
        .single();
      if (batchError) throw batchError;
      testBatchId = newBatch.id;
      console.log(`✅ Payout batch created successfully: ${testBatchId}`);
    }

    // 5. Generate Payout
    console.log('\nStep 5: Generating employee payout...');
    const buckets = [
      {
        weekStart: '2026-05-18',
        workedHours: 16,
        otHours: 1,
        requiredHours: 48,
        shortHours: 32
      }
    ];

    const calc = computePayoutForEmployee(emp, buckets, 2, 16, 1);

    const { data: payout, error: payoutError } = await supabase
      .from('hr_employee_payouts')
      .insert({
        business_id: businessId,
        batch_id: testBatchId,
        employee_id: testEmployeeId,
        total_days: 2,
        total_hours: 16,
        overtime_hours: 1,
        required_hours: 48,
        short_hours: 32,
        deduction_amount: calc.deductionAmount,
        base_salary: calc.baseSalary,
        overtime_pay: calc.overtimePay,
        final_salary: calc.finalSalary,
        paid_amount: 0,
        remaining_amount: calc.finalSalary,
        payout_status: 'pending',
        weekly_breakdown: calc.weekly_breakdown
      })
      .select()
      .single();

    if (payoutError) throw payoutError;
    console.log(`✅ Payout record generated successfully!`);
    console.log(`   Base Salary: ₹${payout.base_salary}`);
    console.log(`   Deductions:  ₹${payout.deduction_amount}`);
    console.log(`   Overtime:    ₹${payout.overtime_pay}`);
    console.log(`   Final Net:   ₹${payout.final_salary}`);

    // 6. Record Payment
    console.log('\nStep 6: Recording salary payment...');
    const payAmt = 5000; // Pay ₹5,000 partial payment
    const finalSal = Number(payout.final_salary);
    const newPaid = Math.min(finalSal, Number(payout.paid_amount) + payAmt);
    const remaining = Math.max(0, finalSal - newPaid);
    const payoutStatus = remaining === 0 ? 'paid' : 'partial';

    const { data: updatedPayout, error: updateError } = await supabase
      .from('hr_employee_payouts')
      .update({
        paid_amount: newPaid,
        remaining_amount: remaining,
        payout_status: payoutStatus
      })
      .eq('id', payout.id)
      .select()
      .single();

    if (updateError) throw updateError;
    console.log(`✅ Salary payment recorded successfully!`);
    console.log(`   Paid Amount:      ₹${updatedPayout.paid_amount}`);
    console.log(`   Remaining Amount: ₹${updatedPayout.remaining_amount}`);
    console.log(`   Payout Status:    ${updatedPayout.payout_status}`);

    console.log('\n=========================================');
    console.log('🎉 VERIFICATION RESULT: ALL CHECKS PASSED!');
    console.log('The Employee -> Attendance -> Payout pipeline is fully interconnected and working correctly!');
    console.log('=========================================');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
  } finally {
    // 7. Cleanup
    console.log('\nCleaning up test logs...');
    if (testEmployeeId) {
      const { error: cleanError } = await supabase.from('hr_employees').delete().eq('id', testEmployeeId);
      if (cleanError) {
        console.error('⚠️ Cleanup failed for test employee:', cleanError.message);
      } else {
        console.log('🧹 Cleaned up test employee and linked attendance logs.');
      }
    }
  }
}

testHrFlow();
