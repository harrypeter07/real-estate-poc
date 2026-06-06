import * as React from "react"
import { cn } from "@/lib/utils"
import { Calendar, Clock } from "lucide-react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, placeholder, onFocus, onBlur, ...props }, ref) => {
    const localRef = React.useRef<HTMLInputElement | null>(null);

    const handleWheel = React.useCallback((e: WheelEvent) => {
      e.preventDefault();
    }, []);

    const setRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        if (localRef.current) {
          localRef.current.removeEventListener("wheel", handleWheel);
        }

        localRef.current = node;

        if (node && type === "number") {
          node.addEventListener("wheel", handleWheel, { passive: false });
        }

        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }
      },
      [ref, type, handleWheel]
    );

    const isDate = type === "date";
    const isTime = type === "time";
    const isDateTime = isDate || isTime;

    const [isMobile, setIsMobile] = React.useState(false);
    const [inputType, setInputType] = React.useState(
      isDateTime ? (props.value ? type : "text") : type
    );

    React.useEffect(() => {
      if (!isDateTime) return;
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, [isDateTime]);

    // Sync input type when value changes externally (e.g. cleared)
    React.useEffect(() => {
      if (isDateTime && isMobile) {
        setInputType(props.value ? type : "text");
      }
    }, [props.value, isDateTime, isMobile]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isDateTime && isMobile) {
        setInputType(type);
        const target = e.target;
        setTimeout(() => {
          try {
            if (typeof target.showPicker === "function") {
              target.showPicker();
            }
          } catch (err) {}
        }, 50);
      }
      if (onFocus) onFocus(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (isDateTime && isMobile) {
        const target = e.currentTarget;
        try {
          if (typeof target.showPicker === "function") {
            target.showPicker();
          }
        } catch (err) {}
      }
      if (props.onClick) props.onClick(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isDateTime && isMobile && !e.target.value) {
        setInputType("text");
      }
      if (onBlur) onBlur(e);
    };

    const useMobileLayout = isDateTime && isMobile;

    const defaultPlaceholder = isDate 
      ? (placeholder || "dd-mm-yyyy") 
      : isTime 
        ? (placeholder || "--:--") 
        : placeholder;

    const inputElement = (
      <input
        type={useMobileLayout ? inputType : type}
        placeholder={useMobileLayout ? defaultPlaceholder : placeholder}
        className={cn(
          "flex h-9 sm:h-10 w-full rounded-md border border-input bg-background px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950",
          type === "number" && "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          useMobileLayout && "pr-8",
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (
            type === "number" &&
            (e.key === "ArrowUp" ||
              e.key === "ArrowDown" ||
              e.key === "PageUp" ||
              e.key === "PageDown")
          ) {
            e.preventDefault();
          }
          if (props.onKeyDown) props.onKeyDown(e);
        }}
        ref={setRef}
        {...props}
      />
    );

    if (useMobileLayout) {
      return (
        <div className="relative w-full">
          {inputElement}
          {isDate ? (
            <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          ) : (
            <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          )}
        </div>
      );
    }

    return inputElement;
  }
)
Input.displayName = "Input"

export { Input }
