import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Weight,
  Bookmark,
  Phone,
  Mail,
  Copy,
  Navigation,
  ChevronDown,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { calculateLoadAge, formatLoadLocation, type Load } from "../data/loads";
import { cn } from "./ui/utils";
import React, { useEffect, useRef, useState } from "react";
import { useAppState } from "../context/app-state";
import { toast } from "sonner";
import { LoadMap } from "./load-map";

interface LoadCardProps {
  load: Load;
  isExpanded: boolean;
  onToggle: () => void;
}

function cleanDisplay(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();

  if (!text || text === "-" || text === "\u2013" || text === "\u2014") {
    return "";
  }

  if (/^(n\/?a|na|null|undefined)$/i.test(text)) {
    return "";
  }

  return text;
}

function displayValue(value: string | number | null | undefined) {
  return cleanDisplay(value) || "-";
}

function hasSelectedText() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.getSelection()?.toString().trim());
}

function formatPerMileLabel(rawValue: string, fallback: number) {
  const clean = cleanDisplay(rawValue.replace(/[()*]/g, ""));

  if (clean) {
    return /\/mi\b/i.test(clean) ? clean : `${clean}/mi`;
  }

  return fallback > 0 ? `$${fallback.toFixed(2)}/mi` : "-";
}

function CompactField({
  label,
  value,
  accent = false,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  multiline?: boolean;
}) {
  const display =
    value === null ||
    value === undefined ||
    (typeof value === "string" && !cleanDisplay(value))
      ? "-"
      : value;

  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-xs font-medium text-foreground",
          !multiline && "truncate",
          accent && "text-emerald-600 dark:text-emerald-300"
        )}
      >
        {display}
      </p>
    </div>
  );
}

function CreditValue({
  creditScore,
  daysToPay,
}: {
  creditScore: string;
  daysToPay: string;
}) {
  return (
    <span className="flex flex-col leading-tight">
      <span>{displayValue(creditScore)}</span>
      <span className="text-muted-foreground">{displayValue(daysToPay)}</span>
    </span>
  );
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Clipboard is unavailable");
  }
}

function CopyContactValue({
  label,
  value,
  icon,
  onCopy,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onCopy: (event: React.MouseEvent, label: string, value: string) => void;
}) {
  const text = cleanDisplay(value);

  if (!text) {
    return "";
  }

  return (
    <button
      type="button"
      onClick={(event) => onCopy(event, label, text)}
      className="group inline-flex min-w-0 items-center gap-1 underline-offset-4 hover:underline"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      {icon}
      <span className="truncate">{text}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-45 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

export function LoadCard({ load, isExpanded, onToggle }: LoadCardProps) {
  const { savedLoadIds, bookedLoadIds, toggleSavedLoad, bookLoad } =
    useAppState();
  const isSaved = savedLoadIds.includes(load.id);
  const isBooked = bookedLoadIds.includes(load.id);
  const [liveAge, setLiveAge] = useState(() =>
    calculateLoadAge(load.receivedAt)
  );
  const [activePanel, setActivePanel] = useState<"details" | "map">("details");
  const touchStartXRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  const formatDate = (dateString: string) => {
    if (!cleanDisplay(dateString)) {
      return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const trailerTypeColors: Record<string, string> = {
    "Dry Van": "border-border bg-muted text-foreground",
    Reefer: "border-border bg-muted text-foreground",
    Flatbed: "border-border bg-muted text-foreground",
    "Power Only": "border-border bg-muted text-foreground",
    "Box Truck": "border-border bg-muted text-foreground",
    Other: "border-border bg-muted text-foreground",
  };

  const statusColors: Record<string, string> = {
    Available:
      "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    Booked: "border-border bg-muted text-muted-foreground",
    Expired: "border-destructive/20 bg-destructive/10 text-destructive",
  };

  useEffect(() => {
    const updateAge = () => {
      setLiveAge(calculateLoadAge(load.receivedAt));
    };

    updateAge();
    const intervalId = window.setInterval(updateAge, 60000);

    return () => window.clearInterval(intervalId);
  }, [load.receivedAt]);

  useEffect(() => {
    setActivePanel("details");
  }, [isExpanded, load.id]);

  const handleToggleSaved = (event: React.MouseEvent) => {
    event.stopPropagation();
    const saved = toggleSavedLoad(load.id);
    toast.success(saved ? "Load saved" : "Load removed");
  };

  const handleBook = (event: React.MouseEvent) => {
    event.stopPropagation();
    const booked = bookLoad(load.id);

    if (booked) {
      toast.success("Load booked successfully");
    } else {
      toast.message("This load is already in My Loads");
    }
  };

  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;

    if (
      suppressNextClickRef.current ||
      hasSelectedText() ||
      target?.closest("a,button,input,textarea,select,[role='button']")
    ) {
      suppressNextClickRef.current = false;
      return;
    }

    onToggle();
  };

  const stopDetailCloseWhileSelecting = (event: React.MouseEvent) => {
    if (hasSelectedText()) {
      event.stopPropagation();
    }
  };

  const handlePanelTouchStart = (event: React.TouchEvent) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handlePanelTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartXRef.current = null;

    if (startX === null || endX === undefined) {
      return;
    }

    const delta = endX - startX;

    if (delta < -45) {
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 400);
      setActivePanel("map");
    } else if (delta > 45) {
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 400);
      setActivePanel("details");
    }
  };

  const numericPerMile =
    load.ratePerMile > 0
      ? load.ratePerMile
      : load.distance > 0
      ? load.rate / load.distance
      : 0;
  const perMileLabel = formatPerMileLabel(
    load.contact.ratePerMileText,
    numericPerMile
  );
  const originLabel = formatLoadLocation(load.origin);
  const destinationLabel = formatLoadLocation(load.destination);
  const hasRealPhone = Boolean(
    cleanDisplay(load.contact.phone) &&
      cleanDisplay(load.contact.phone) !== "(000) 000-0000"
  );
  const equipmentSummary = [load.length, load.capacity || load.loadType]
    .map(cleanDisplay)
    .filter(Boolean)
    .join(" / ");
  const market = load.contact.marketRates;
  const hasMarketRates =
    Boolean(
      market.spotRateText || market.spotRatePerMileText || market.rangeText
    ) || market.contractUnavailable;
  const isDetailLoading =
    load.detailStatus === "list_only" ||
    load.detailStatus === "pending" ||
    load.detailStatus === "retrying" ||
    load.detailStatus === "enriching";
  const isDetailFailed = load.detailStatus === "failed";

  const handleCopyContact = async (
    event: React.MouseEvent,
    label: string,
    value: string
  ) => {
    event.stopPropagation();
    const clipboardValue = label === "MC" ? value.replace(/\D/g, "") : value;

    if (!clipboardValue) {
      toast.error(`${label} could not be copied`);
      return;
    }

    try {
      await copyText(clipboardValue);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`${label} could not be copied`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer overflow-hidden rounded-md border border-border bg-card shadow-sm transition-all duration-200",
          "hover:border-foreground/30 hover:bg-accent/30",
          isExpanded && "border-foreground/35 bg-card"
        )}
        onClick={handleCardClick}
      >
        <div className="px-2 py-1 sm:px-2.5">
          <div className="grid gap-1.5 lg:grid-cols-[126px_minmax(180px,1fr)_108px_96px_128px] lg:items-center">
            <div className="flex min-w-0 flex-col items-start gap-1">
              <Badge className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
                {displayValue(liveAge)}
              </Badge>
              <div className="flex flex-wrap items-center gap-1">
                <Badge
                  className={`${
                    statusColors[load.status]
                  } rounded-md px-1.5 py-0.5 text-[9px] font-semibold`}
                >
                  {load.status}
                </Badge>
                <Badge
                  className={`${
                    trailerTypeColors[load.trailerType]
                  } rounded-md px-1.5 py-0.5 text-[9px] font-semibold`}
                >
                  {load.trailerType}
                </Badge>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-[13px] font-semibold text-foreground">
                  {originLabel}
                </h3>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <h3 className="truncate text-[13px] font-semibold text-foreground">
                  {destinationLabel}
                </h3>
              </div>

              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="max-w-[150px] truncate xl:max-w-[220px]">
                    {displayValue(load.broker)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="h-3 w-3" />
                  <span>
                    {load.distance > 0
                      ? `${load.distance.toLocaleString()} mi`
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  <span>
                    DH-O:{" "}
                    {load.computedDeadheadMiles !== null
                      ? `${load.computedDeadheadMiles} mi`
                      : "-"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Weight className="h-3 w-3" />
                  <span>
                    {load.weight > 0
                      ? `${load.weight.toLocaleString()} lbs`
                      : "-"}
                  </span>
                </div>
                {equipmentSummary && (
                  <span className="truncate">{equipmentSummary}</span>
                )}
              </div>
            </div>

            <div className="text-[11px] lg:space-y-0.5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  Pickup
                </p>
                <p className="font-medium text-foreground">
                  {formatDate(load.pickupDate)}
                </p>
                <p className="text-muted-foreground">
                  {displayValue(load.pickupTime)}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-background px-2 py-0.5 text-left lg:text-right">
              <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                Rate
              </p>
              <p className="text-sm font-semibold leading-tight text-foreground">
                {load.rate > 0 ? `$${load.rate.toLocaleString()}` : "-"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {perMileLabel}
              </p>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-1 sm:justify-start lg:justify-end">
              <Button
                className="h-7 min-w-[54px] flex-shrink-0 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={handleBook}
              >
                {isBooked ? "Booked" : "Book"}
              </Button>
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleSaved}
                  className="h-7 w-7 flex-shrink-0 rounded-md hover:bg-accent hover:text-foreground"
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4",
                      isSaved && "fill-primary text-primary"
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle();
                  }}
                  className="h-7 w-7 flex-shrink-0 rounded-md hover:bg-accent hover:text-foreground"
                  aria-expanded={isExpanded}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="overflow-hidden"
              onMouseUp={stopDetailCloseWhileSelecting}
              onClick={stopDetailCloseWhileSelecting}
            >
              <div className="border-t border-border bg-muted/35 p-2.5 sm:p-3">
                <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-md border border-border bg-card p-1 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setActivePanel("details")}
                    className={cn(
                      "rounded px-3 py-2 text-xs font-semibold transition",
                      activePanel === "details"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel("map")}
                    className={cn(
                      "rounded px-3 py-2 text-xs font-semibold transition",
                      activePanel === "map"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    Map
                  </button>
                </div>

                <div
                  onTouchStart={handlePanelTouchStart}
                  onTouchEnd={handlePanelTouchEnd}
                >
                  <div
                    className={cn(
                      "grid-cols-1 gap-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3",
                      activePanel === "details" ? "grid" : "hidden lg:grid"
                    )}
                  >
                    <section className="rounded-md border border-border bg-card p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                          Load Information
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                        <CompactField
                          label="Weight"
                          value={
                            load.weight > 0
                              ? `${load.weight.toLocaleString()} lbs`
                              : ""
                          }
                        />
                        <CompactField label="Truck" value={load.trailerType} />
                        <CompactField
                          label="Load"
                          value={load.loadType || load.capacity}
                        />
                        <CompactField label="Length" value={load.length} />
                        <CompactField
                          label="Commodity"
                          value={load.commodity || ""}
                        />
                        <CompactField
                          label="Trip"
                          value={
                            load.distance > 0
                              ? `${load.distance.toLocaleString()} mi`
                              : ""
                          }
                        />
                        <CompactField label="RPM" value={perMileLabel} />
                        <CompactField
                          label="DH-O"
                          value={
                            load.computedDeadheadMiles !== null
                              ? `${load.computedDeadheadMiles} mi`
                              : ""
                          }
                        />
                        <CompactField
                          label="Reference"
                          value={load.referenceId}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-0 border-t border-border pt-3">
                        <div className="min-w-0 border-r border-border pr-3">
                          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            Pickup
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-foreground">
                            {originLabel}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {displayValue(
                              load.origin.date || formatDate(load.pickupDate)
                            )}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-300">
                            {displayValue(load.origin.time || load.pickupTime)}
                          </p>
                        </div>
                        <div className="min-w-0 pl-3">
                          <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            Delivery
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-foreground">
                            {destinationLabel}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {load.destination.date || "-"}
                          </p>
                          <p className="text-[11px] text-blue-600 dark:text-blue-300">
                            {displayValue(
                              load.destination.time ||
                                (load.distance > 0
                                  ? `${load.distance.toLocaleString()} mi`
                                  : "")
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Comments
                        </p>
                        <p className="mt-1 text-xs leading-5 text-foreground">
                          {displayValue(load.notes)}
                        </p>
                      </div>
                    </section>

                    <section className="rounded-md border border-border bg-card p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                            Broker Information
                          </h4>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {load.contact.mcNumber && (
                            <Badge className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[9px] font-semibold text-foreground">
                              {load.contact.mcNumber}
                            </Badge>
                          )}
                          {load.contact.factoringEligible && (
                            <Badge className="rounded-md border border-emerald-600/25 bg-emerald-600/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Factoring
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="mb-3 text-sm font-semibold text-foreground">
                        {displayValue(load.broker)}
                      </p>

                      {isDetailLoading && (
                        <div className="mb-3 rounded-md border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground">
                          Broker details are being enriched...
                        </div>
                      )}

                      {isDetailFailed && (
                        <div className="mb-3 rounded-md border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                          Detail fetch failed. Basic load info is still available.
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <CompactField
                          label="Phone"
                          value={
                            hasRealPhone ? (
                              <CopyContactValue
                                label="Phone"
                                value={load.contact.phone}
                                icon={
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                }
                                onCopy={handleCopyContact}
                              />
                            ) : (
                              ""
                            )
                          }
                        />
                        <CompactField
                          label="Email"
                          value={
                            cleanDisplay(load.contact.email) ? (
                              <CopyContactValue
                                label="Email"
                                value={load.contact.email}
                                icon={
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                }
                                onCopy={handleCopyContact}
                              />
                            ) : (
                              ""
                            )
                          }
                        />
                        <CompactField
                          label="MC"
                          value={
                            cleanDisplay(load.contact.mcNumber) ? (
                              <CopyContactValue
                                label="MC"
                                value={load.contact.mcNumber}
                                onCopy={handleCopyContact}
                              />
                            ) : (
                              ""
                            )
                          }
                        />
                        <CompactField
                          label="Location"
                          value={load.contact.companyLocation}
                        />
                        <CompactField
                          label="Credit"
                          multiline
                          value={
                            <CreditValue
                              creditScore={load.contact.creditScore}
                              daysToPay={load.contact.daysToPay}
                            />
                          }
                        />
                        <CompactField
                          label="Rating"
                          value={
                            load.contact.rating
                              ? `${load.contact.rating}/5${
                                  load.contact.reviews
                                    ? ` (${load.contact.reviews})`
                                    : ""
                                }`
                              : ""
                          }
                        />
                        <CompactField
                          label="Website"
                          value={load.contact.website}
                        />
                        <CompactField
                          label="Appointment"
                          value={load.appointmentRequired ? "Required" : ""}
                        />
                        <CompactField
                          label="Detail"
                          value={
                            load.detailStatus === "enriched" ? "Ready" : ""
                          }
                        />
                      </div>

                      {hasMarketRates && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Rate & Market
                          </p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            <CompactField
                              label="Total"
                              value={
                                load.rate > 0
                                  ? `$${load.rate.toLocaleString()}`
                                  : ""
                              }
                            />
                            <CompactField
                              label="Load RPM"
                              value={perMileLabel}
                            />
                            <CompactField
                              label="Spot"
                              value={market.spotRateText}
                              accent
                            />
                            <CompactField
                              label="Spot RPM"
                              value={market.spotRatePerMileText}
                              accent
                            />
                            <CompactField
                              label="Range"
                              value={
                                market.rangeLowText && market.rangeHighText
                                  ? `${market.rangeLowText} - ${market.rangeHighText}`
                                  : market.rangeText
                              }
                            />
                            <CompactField
                              label="Range RPM"
                              value={
                                market.rangePerMileLowText &&
                                market.rangePerMileHighText
                                  ? `${market.rangePerMileLowText} - ${market.rangePerMileHighText}`
                                  : ""
                              }
                            />
                            <CompactField
                              label="Contract"
                              value={
                                market.contractUnavailable ? "Unavailable" : ""
                              }
                            />
                          </div>
                        </div>
                      )}
                    </section>

                    {(load.pickupDetails || load.deliveryDetails) && (
                      <section className="rounded-md border border-border bg-card p-3 xl:hidden">
                        <div className="mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                            Appointment Notes
                          </h4>
                        </div>
                        <div className="grid gap-2">
                          <CompactField
                            label="Pickup"
                            value={load.pickupDetails}
                            multiline
                          />
                          <CompactField
                            label="Delivery"
                            value={load.deliveryDetails}
                            multiline
                          />
                        </div>
                      </section>
                    )}

                    <div className="hidden lg:block">
                      <LoadMap load={load} inline />
                    </div>
                  </div>

                  {activePanel === "map" && (
                    <div className="lg:hidden">
                      <LoadMap load={load} inline />
                    </div>
                  )}
                </div>

                <div className="mt-2.5 grid gap-2.5 rounded-md border border-border bg-card p-3 md:grid-cols-[minmax(0,1fr)_152px_152px_152px] md:items-center">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Actions
                    </p>
                    <p className="mt-1 text-xs text-foreground">
                      {isBooked ? "Booked" : "Available"}
                    </p>
                  </div>
                  <Button
                    className="h-9 w-full rounded-md bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={handleBook}
                  >
                    {isBooked ? "Booked" : "Book Now"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-md border-border text-xs text-foreground hover:bg-accent"
                    disabled={!hasRealPhone}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!hasRealPhone) {
                        return;
                      }
                      window.location.href = `tel:${load.contact.phone}`;
                    }}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call Broker
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-md border-border text-xs text-foreground hover:bg-accent"
                    onClick={handleToggleSaved}
                  >
                    <Bookmark
                      className={cn("mr-2 h-4 w-4", isSaved && "fill-primary")}
                    />
                    {isSaved ? "Saved" : "Save Load"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
