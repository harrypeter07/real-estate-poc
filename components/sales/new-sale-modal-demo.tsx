"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Search, 
  User, 
  TrendingUp, 
  IndianRupee, 
  Calendar, 
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

// --- Mock Data ---
const MOCK_PLOTS = [
  { id: 1, label: "Plot 125 – 1200 sqft", area: 1200 },
  { id: 2, label: "Plot 130 – 1500 sqft", area: 1500 },
  { id: 3, label: "Plot 140 – 900 sqft", area: 900 },
];

const MOCK_DEFAULTS = {
  customer: "Sunita Bai (9947571161)",
  advisor: "zayn (4546)",
  advisorPrice: 1300,
  downPayment: 50000,
  emiDay: 5,
};

// --- Helper for Currency ---
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

export default function NewSaleModalDemo({ onClose }: { onClose?: () => void }) {
  // --- Form State ---
  const [plotId, setPlotId] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");
  const [soldBy, setSoldBy] = useState<string>("Advisor");
  const [advisor, setAdvisor] = useState<string>("");
  const [advisorPrice, setAdvisorPrice] = useState<number>(1300);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [monthlyEmi, setMonthlyEmi] = useState<number>(0);
  const [emiDay, setEmiDay] = useState<number>(5);

  // --- UI/Validation State ---
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Calculations ---
  const selectedPlot = useMemo(() => 
    MOCK_PLOTS.find(p => p.id.toString() === plotId), [plotId]
  );

  const sellingPrice = useMemo(() => {
    if (!selectedPlot) return 0;
    return selectedPlot.area * advisorPrice;
  }, [selectedPlot, advisorPrice]);

  const remainingBalance = useMemo(() => {
    return Math.max(0, sellingPrice - downPayment);
  }, [sellingPrice, downPayment]);

  // --- Actions ---
  const handleFillMockData = () => {
    setPlotId("1");
    setCustomer(MOCK_DEFAULTS.customer);
    setSoldBy("Advisor");
    setAdvisor(MOCK_DEFAULTS.advisor);
    setAdvisorPrice(MOCK_DEFAULTS.advisorPrice);
    setDownPayment(MOCK_DEFAULTS.downPayment);
    setEmiDay(MOCK_DEFAULTS.emiDay);
    // Clear all touched states
    setTouched({});
  };

  const handleTouch = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Mark all as touched on submit
    const allTouched = {
      plotId: true,
      customer: true,
      advisor: true,
      sellingPrice: true,
    };
    setTouched(allTouched);

    // Basic validation check
    if (!plotId || sellingPrice <= 0) {
      console.log("Validation failed");
      setIsSubmitting(false);
      return;
    }

    alert("Sale Submitted Successfully!");
    setIsSubmitting(false);
  };

  // --- Error Logic ---
  const showPlotError = touched.plotId && !plotId;
  const showSellingPriceError = (touched.sellingPrice || isSubmitting) && sellingPrice <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-white to-zinc-50/50 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Sell / Book
            </h2>
            <p className="text-sm text-zinc-500 font-medium mt-0.5">
              Besa Premium Plots Phase 56 • Plot 125
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                New Sale / Booking
              </h3>
              <p className="text-xs text-zinc-500">Record a new plot transaction</p>
            </div>
            <button 
              onClick={handleFillMockData}
              className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold rounded-lg shadow-sm hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Fill Mock Data
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column — ENTITIES */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Entities</span>
              </div>

              {/* Select Plot */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                  Select Plot *
                </label>
                <div className="relative group">
                  <select 
                    value={plotId}
                    onChange={(e) => setPlotId(e.target.value)}
                    onBlur={() => handleTouch("plotId")}
                    className={`w-full h-11 pl-4 pr-10 bg-white border ${showPlotError ? 'border-red-300 bg-red-50/30' : 'border-zinc-200'} rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                  >
                    <option value="">Choose an available plot</option>
                    {MOCK_PLOTS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
                </div>
                {showPlotError && (
                  <p className="text-[11px] font-semibold text-red-500 flex items-center gap-1 mt-1 animate-in slide-in-from-top-1">
                    <Info className="w-3 h-3" />
                    Invalid plot selected
                  </p>
                )}
              </div>

              {/* Select Customer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Select Customer *</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Search customer..."
                    className="w-full h-11 pl-10 pr-10 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <div className="absolute right-1 top-1 flex flex-col">
                    <button type="button" className="p-1 hover:bg-zinc-50 rounded text-zinc-400"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" className="p-1 hover:bg-zinc-50 rounded text-zinc-400"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>

              {/* Sold By */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Sold By</label>
                <div className="relative">
                  <select 
                    value={soldBy}
                    onChange={(e) => setSoldBy(e.target.value)}
                    className="w-full h-11 pl-4 pr-10 bg-white border border-zinc-200 rounded-xl text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    <option>Advisor</option>
                    <option>Self</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Select Advisor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Select Advisor *</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={advisor}
                    onChange={(e) => setAdvisor(e.target.value)}
                    placeholder="Search advisor..."
                    className="w-full h-11 pl-10 pr-10 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <div className="absolute right-1 top-1 flex flex-col">
                    <button type="button" className="p-1 hover:bg-zinc-50 rounded text-zinc-400"><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" className="p-1 hover:bg-zinc-50 rounded text-zinc-400"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>

              {/* Advisor Selling Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Advisor selling price (₹/sqft)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={advisorPrice}
                    onChange={(e) => setAdvisorPrice(Number(e.target.value))}
                    className="w-full h-11 pl-4 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <IndianRupee className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Prefills from Manage on this project; edit for this plot only if needed.
                </p>
              </div>
            </div>

            {/* Right Column — FINANCIALS */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Financials</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Selling Price (Auto) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-red-500">Selling Price (Auto)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      readOnly
                      disabled
                      value={formatCurrency(sellingPrice)}
                      className="w-full h-11 pl-4 bg-indigo-50/30 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Down Payment */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Down Payment</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full h-11 pl-4 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Selling Price Error Message */}
              {showSellingPriceError && (
                <div className="bg-red-50 border border-red-100 p-2 rounded-lg animate-in slide-in-from-top-1">
                  <p className="text-[11px] font-bold text-red-600 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Total sale amount must be positive
                  </p>
                </div>
              )}

              {/* Remaining Balance Display */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Remaining Balance:</span>
                <span className="text-lg font-black text-zinc-900">{formatCurrency(remainingBalance)}</span>
              </div>

              {/* Monthly EMI */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Monthly EMI</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={monthlyEmi}
                    onChange={(e) => setMonthlyEmi(Number(e.target.value))}
                    className="w-full h-11 pl-4 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <IndianRupee className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
              </div>

              {/* EMI Day */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">EMI Day (1-31)</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={emiDay}
                    onChange={(e) => setEmiDay(Number(e.target.value))}
                    className="w-full h-11 pl-4 bg-white border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-zinc-200 hover:bg-indigo-600 hover:shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
