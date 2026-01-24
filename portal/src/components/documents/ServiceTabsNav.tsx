import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getServiceIcon, getServiceColor } from "@/lib/constants";
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "@/lib/icons";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface ServiceTabsNavProps {
  services: Array<Doc<"serviceTypes"> & { documentCount?: number }>;
  selectedServiceId: Id<"serviceTypes"> | "all" | null;
  onSelectService: (serviceId: Id<"serviceTypes"> | "all") => void;
  showAllTab?: boolean;
  totalDocuments?: number;
  className?: string;
}

export function ServiceTabsNav({
  services,
  selectedServiceId,
  onSelectService,
  showAllTab = true,
  totalDocuments = 0,
  className,
}: ServiceTabsNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Check scroll position to show/hide arrows
  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Set up resize listener once
  useEffect(() => {
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  // Re-check scroll when services change
  useEffect(() => {
    checkScroll();
  }, [services, checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const getIcon = (iconName: string) => {
    return getServiceIcon(iconName);
  };

  const getColors = (color: string) => {
    return getServiceColor(color);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-[#EBEBEB] rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4 text-[#6b6b76]" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1 -mx-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* All Services Tab */}
        {showAllTab && (
          <button
            onClick={() => onSelectService("all")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
              selectedServiceId === "all"
                ? "bg-[#0f0f12] text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1)]"
                : "bg-white border border-[#EBEBEB] text-[#3A3A3A] hover:bg-[#f8f8f8] hover:border-[#d5d5d5]"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>All Services</span>
            {totalDocuments > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-medium",
                  selectedServiceId === "all"
                    ? "bg-white/20 text-white"
                    : "bg-[#f0f0f0] text-[#6b6b76]"
                )}
              >
                {totalDocuments}
              </span>
            )}
          </button>
        )}

        {/* Service Tabs */}
        {services.map((service) => {
          const Icon = getIcon(service.icon);
          const colors = getColors(service.color);
          const isSelected = selectedServiceId === service._id;

          return (
            <button
              key={service._id}
              onClick={() => onSelectService(service._id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0",
                isSelected
                  ? cn(colors.activeBg, "text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]")
                  : cn("bg-white border", colors.border, colors.text, "hover:bg-[#f8f8f8]")
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{service.name}</span>
              {service.documentCount !== undefined && service.documentCount > 0 && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-medium",
                    isSelected
                      ? "bg-white/20 text-white"
                      : cn(colors.bg, colors.text)
                  )}
                >
                  {service.documentCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-[#EBEBEB] rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4 text-[#6b6b76]" />
        </button>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
