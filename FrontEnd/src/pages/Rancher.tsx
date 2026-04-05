import * as React from "react";
import { CheckCircle, X, ChevronRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SexCode } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import {
  postRancherCreateHerd,
  postRancherPublishHerd,
  postRancherRegisterCattleBulk,
  type RancherBulkCowPayload,
} from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Season = "Spring" | "Fall";

interface HerdFormData {
  name: string;
  genetics_label: string;
  breed_code: string;
  season: Season | "";
  listing_price: string;
  head_count: string;
}

interface CowFormData {
  registration_number: string;
  official_id_suffix: string; // user types last 12 digits; "840" prepended on submit
  breed_code: string;
  sex_code: SexCode | "";
  birth_date: string;
  weight_lbs: string;
  animal_name: string;
  sire_registration_number: string;
  dam_registration_number: string;
  is_genomic_enhanced: boolean;
}

interface QueuedCow extends CowFormData {
  _queueId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEX_OPTIONS: { value: SexCode; label: string }[] = [
  { value: "B", label: "Bull" },
  { value: "C", label: "Calf" },
  { value: "H", label: "Heifer" },
  { value: "S", label: "Steer" },
];

const SEASON_OPTIONS: { value: Season; label: string }[] = [
  { value: "Spring", label: "Spring" },
  { value: "Fall", label: "Fall" },
];

const STEP_LABELS = ["Create Herd", "Register Cattle", "Review & Publish"];

const EMPTY_HERD: HerdFormData = {
  name: "",
  genetics_label: "",
  breed_code: "",
  season: "",
  listing_price: "",
  head_count: "",
};

const EMPTY_COW: CowFormData = {
  registration_number: "",
  official_id_suffix: "",
  breed_code: "",
  sex_code: "",
  birth_date: "",
  weight_lbs: "",
  animal_name: "",
  sire_registration_number: "",
  dam_registration_number: "",
  is_genomic_enhanced: false,
};

// ── StepIndicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start">
      {STEP_LABELS.map((label, idx) => {
        const num = idx + 1;
        const done = current > num;
        const active = current === num;
        return (
          <React.Fragment key={num}>
            {idx > 0 && (
              <div
                className={cn(
                  "mt-4 h-px flex-1",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-background text-primary"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : num}
              </div>
              <span
                className={cn(
                  "max-w-[5rem] text-center text-xs font-medium leading-tight",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── PillGroup ─────────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            disabled && "cursor-not-allowed opacity-60",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Rancher (main page) ───────────────────────────────────────────────────────

export function Rancher() {
  const { currentUser } = useAuth();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Step 1
  const [herd, setHerd] = React.useState<HerdFormData>(EMPTY_HERD);
  const [herdSnapshot, setHerdSnapshot] = React.useState<HerdFormData | null>(null);
  const [herdError, setHerdError] = React.useState<string | null>(null);

  // Step 2
  const [cow, setCow] = React.useState<CowFormData>(EMPTY_COW);
  const [cowQueue, setCowQueue] = React.useState<QueuedCow[]>([]);
  const [cowError, setCowError] = React.useState<string | null>(null);
  const [cattleError, setCattleError] = React.useState<string | null>(null);

  // Step 3
  const [published, setPublished] = React.useState(false);
  const [createdHerdId, setCreatedHerdId] = React.useState<string | null>(null);
  const [isCreatingHerd, setIsCreatingHerd] = React.useState(false);
  const [isRegisteringCattle, setIsRegisteringCattle] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [cattleRegistered, setCattleRegistered] = React.useState(false);

  const rancherId = currentUser?.userId ?? null;
  const cattleLocked = cattleRegistered || isRegisteringCattle;

  // ── Step 1 handlers ──────────────────────────────────────────────────────────

  function setHerdField<K extends keyof HerdFormData>(key: K, val: HerdFormData[K]) {
    setHerd((h) => ({ ...h, [key]: val }));
  }

  async function handleCreateHerd(e: React.FormEvent) {
    e.preventDefault();
    setHerdError(null);

    if (!rancherId) {
      setHerdError("Missing logged-in rancher session.");
      return;
    }

    if (
      !herd.name.trim() ||
      !herd.genetics_label.trim() ||
      !herd.breed_code.trim() ||
      !herd.season ||
      !herd.listing_price ||
      !herd.head_count
    ) {
      setHerdError("All fields are required.");
      return;
    }

    if (parseInt(herd.head_count, 10) < 20) {
      setHerdError("Head count must be at least 20.");
      return;
    }

    try {
      setIsCreatingHerd(true);
      const listingPrice = Number.parseFloat(herd.listing_price);
      const headCount = Number.parseInt(herd.head_count, 10);

      const result = await postRancherCreateHerd(rancherId, {
        name: herd.name.trim(),
        genetics_label: herd.genetics_label.trim(),
        breed_code: herd.breed_code.trim().toUpperCase(),
        season: herd.season,
        listing_price: listingPrice,
        head_count: headCount,
        purchase_status: "pending",
      });

      setCreatedHerdId(result.herd.herd_id);
      setHerdSnapshot({ ...herd });
      setStep(2);
    } catch (err: unknown) {
      setHerdError(err instanceof Error ? err.message : "Failed to create herd.");
    } finally {
      setIsCreatingHerd(false);
    }
  }

  // ── Step 2 handlers ──────────────────────────────────────────────────────────

  function setCowField<K extends keyof CowFormData>(key: K, val: CowFormData[K]) {
    setCow((c) => ({ ...c, [key]: val }));
  }

  function handleAddCow(e: React.FormEvent) {
    e.preventDefault();
    setCowError(null);

    if (cattleRegistered) {
      setCowError("Cattle already registered for this lot. Go to review/publish.");
      return;
    }

    if (
      !cow.registration_number.trim() ||
      !cow.official_id_suffix.trim() ||
      !cow.breed_code.trim() ||
      !cow.sex_code ||
      !cow.birth_date ||
      !cow.weight_lbs
    ) {
      setCowError("Please fill in all required fields.");
      return;
    }

    if (cow.official_id_suffix.length !== 12) {
      setCowError("Official ID suffix must be exactly 12 digits (840 + 12 = 15 total).");
      return;
    }

    setCowQueue((q) => [...q, { ...cow, _queueId: crypto.randomUUID() }]);
    setCow(EMPTY_COW);
  }

  function handleRemoveCow(queueId: string) {
    if (cattleRegistered) return;
    setCowQueue((q) => q.filter((c) => c._queueId !== queueId));
  }

  async function handleContinueToReview() {
    setCattleError(null);

    if (!rancherId) {
      setCattleError("Missing logged-in rancher session.");
      return;
    }

    if (!createdHerdId) {
      setCattleError("Herd has not been created yet.");
      return;
    }

    if (cowQueue.length === 0) {
      setCattleError("Add at least one cow before continuing.");
      return;
    }

    if (cattleRegistered) {
      setStep(3);
      return;
    }

    const cattlePayload: RancherBulkCowPayload[] = cowQueue.map((item) => ({
      registration_number: item.registration_number.trim(),
      official_id_suffix: item.official_id_suffix.trim(),
      breed_code: item.breed_code.trim().toUpperCase(),
      sex_code: item.sex_code as RancherBulkCowPayload["sex_code"],
      birth_date: item.birth_date,
      weight_lbs: Number.parseFloat(item.weight_lbs),
      animal_name: item.animal_name.trim() || undefined,
      sire_registration_number: item.sire_registration_number.trim() || undefined,
      dam_registration_number: item.dam_registration_number.trim() || undefined,
      is_genomic_enhanced: item.is_genomic_enhanced,
    }));

    try {
      setIsRegisteringCattle(true);
      await postRancherRegisterCattleBulk(rancherId, createdHerdId, cattlePayload);
      setCattleRegistered(true);
      setStep(3);
    } catch (err: unknown) {
      setCattleError(err instanceof Error ? err.message : "Failed to register cattle.");
    } finally {
      setIsRegisteringCattle(false);
    }
  }

  // ── Step 3 handlers ──────────────────────────────────────────────────────────

  async function handlePublish() {
    if (cowQueue.length === 0) return;
    setCattleError(null);
    if (!createdHerdId) {
      setCattleError("Missing herd id for publish.");
      return;
    }
    if (!rancherId) {
      setCattleError("Missing logged-in rancher session.");
      return;
    }

    try {
      setIsPublishing(true);
      const listingPrice = Number.parseFloat(herdSnapshot?.listing_price ?? herd.listing_price);
      await postRancherPublishHerd(
        rancherId,
        createdHerdId,
        Number.isFinite(listingPrice) ? listingPrice : undefined
      );
      setPublished(true);
    } catch (err: unknown) {
      setCattleError(err instanceof Error ? err.message : "Failed to publish lot.");
    } finally {
      setIsPublishing(false);
    }
  }

  function handleReset() {
    setStep(1);
    setHerd(EMPTY_HERD);
    setHerdSnapshot(null);
    setCow(EMPTY_COW);
    setCowQueue([]);
    setPublished(false);
    setCreatedHerdId(null);
    setIsCreatingHerd(false);
    setIsRegisteringCattle(false);
    setIsPublishing(false);
    setCattleRegistered(false);
    setHerdError(null);
    setCowError(null);
    setCattleError(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (published) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Lot Published!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {herdSnapshot?.name}
            </span>{" "}
            is now visible to investors.
          </p>
          <Button className="mt-6" variant="outline" onClick={handleReset}>
            Post Another Lot
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Post a Lot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a herd listing, register cattle, then publish for investors.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} />

      <Separator />

      {/* ── Step 1: Create Herd ─────────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Herd Details</CardTitle>
            <CardDescription>
              Define the lot name, breed, and pricing for this listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateHerd} className="space-y-4">
              <Field label="Lot Name" required>
                <Input
                  placeholder="e.g. Spring Angus — 2026"
                  value={herd.name}
                  disabled={isCreatingHerd}
                  onChange={(e) => setHerdField("name", e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Genetics Label" required>
                  <Input
                    placeholder="e.g. Angus × Hereford"
                    value={herd.genetics_label}
                    disabled={isCreatingHerd}
                    onChange={(e) => setHerdField("genetics_label", e.target.value)}
                  />
                </Field>
                <Field label="Breed Code" required>
                  <Input
                    placeholder="e.g. AN"
                    value={herd.breed_code}
                    disabled={isCreatingHerd}
                    onChange={(e) =>
                      setHerdField("breed_code", e.target.value.toUpperCase())
                    }
                  />
                </Field>
              </div>

              <Field label="Season" required>
                <PillGroup
                  options={SEASON_OPTIONS}
                  value={herd.season}
                  disabled={isCreatingHerd}
                  onChange={(v) => setHerdField("season", v)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Listing Price ($)" required>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 250000"
                    value={herd.listing_price}
                    disabled={isCreatingHerd}
                    onChange={(e) => setHerdField("listing_price", e.target.value)}
                  />
                </Field>
                <Field label="Head Count" required hint="Minimum 20 head per lot">
                  <Input
                    type="number"
                    min="20"
                    step="1"
                    placeholder="e.g. 50"
                    value={herd.head_count}
                    disabled={isCreatingHerd}
                    onChange={(e) => setHerdField("head_count", e.target.value)}
                  />
                </Field>
              </div>

              {herdError && (
                <p className="text-sm text-destructive">{herdError}</p>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isCreatingHerd}>
                  {isCreatingHerd ? "Creating Herd..." : "Create Herd"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Register Cattle ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add a Cow</CardTitle>
              <CardDescription>
                Fill in the details and click &ldquo;Add Cow&rdquo; to queue each
                animal. Continue when you&rsquo;re ready to review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCow} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Registration Number" required>
                    <Input
                      placeholder="e.g. 1234567"
                      value={cow.registration_number}
                      disabled={cattleLocked}
                      onChange={(e) =>
                        setCowField("registration_number", e.target.value)
                      }
                    />
                  </Field>
                  <Field
                    label="Official ID (USDA EID)"
                    required
                    hint="840 prefix applied automatically — enter 12-digit suffix"
                  >
                    <div className="flex items-center gap-1">
                      <span className="flex h-10 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                        840
                      </span>
                      <Input
                        placeholder="000000000000"
                        maxLength={12}
                        value={cow.official_id_suffix}
                        disabled={cattleLocked}
                        onChange={(e) =>
                          setCowField(
                            "official_id_suffix",
                            e.target.value.replace(/\D/g, "").slice(0, 12)
                          )
                        }
                      />
                    </div>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Breed Code" required>
                    <Input
                      placeholder="e.g. AN"
                      value={cow.breed_code}
                      disabled={cattleLocked}
                      onChange={(e) =>
                        setCowField("breed_code", e.target.value.toUpperCase())
                      }
                    />
                  </Field>
                  <Field label="Birth Date" required>
                    <Input
                      type="date"
                      value={cow.birth_date}
                      disabled={cattleLocked}
                      onChange={(e) => setCowField("birth_date", e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Sex" required>
                  <PillGroup
                    options={SEX_OPTIONS}
                    value={cow.sex_code}
                    disabled={cattleLocked}
                    onChange={(v) => setCowField("sex_code", v)}
                  />
                </Field>

                <Field label="Weight (lbs)" required>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 650"
                    value={cow.weight_lbs}
                    disabled={cattleLocked}
                    onChange={(e) => setCowField("weight_lbs", e.target.value)}
                  />
                </Field>

                <Separator />

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Optional
                </p>

                <Field label="Animal Name">
                  <Input
                    placeholder="e.g. Bessie"
                    value={cow.animal_name}
                    disabled={cattleLocked}
                    onChange={(e) => setCowField("animal_name", e.target.value)}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sire Registration #">
                    <Input
                      placeholder="e.g. 7654321"
                      value={cow.sire_registration_number}
                      disabled={cattleLocked}
                      onChange={(e) =>
                        setCowField("sire_registration_number", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Dam Registration #">
                    <Input
                      placeholder="e.g. 9876543"
                      value={cow.dam_registration_number}
                      disabled={cattleLocked}
                      onChange={(e) =>
                        setCowField("dam_registration_number", e.target.value)
                      }
                    />
                  </Field>
                </div>

                <Field label="Genomic Enhanced">
                  <button
                    type="button"
                    disabled={cattleLocked}
                    onClick={() =>
                      setCowField("is_genomic_enhanced", !cow.is_genomic_enhanced)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      cow.is_genomic_enhanced
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {cow.is_genomic_enhanced ? "Yes" : "No"}
                  </button>
                </Field>

                {cowError && (
                  <p className="text-sm text-destructive">{cowError}</p>
                )}

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="secondary" disabled={cattleLocked}>
                    {cattleLocked ? "Cattle Registered" : "+ Add Cow"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Queued cow cards */}
          {cowQueue.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Queued — {cowQueue.length}{" "}
                {cowQueue.length === 1 ? "cow" : "cows"}
              </p>
              {cowQueue.map((c) => (
                <div
                  key={c._queueId}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {c.animal_name || c.registration_number}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {c.sex_code}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {c.breed_code}
                      </Badge>
                      {c.is_genomic_enhanced && (
                        <Badge variant="secondary" className="text-xs">
                          GE
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      Reg: {c.registration_number} &bull; EID: 840
                      {c.official_id_suffix} &bull; DOB: {c.birth_date} &bull;{" "}
                      {c.weight_lbs} lbs
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={cattleLocked}
                    onClick={() => handleRemoveCow(c._queueId)}
                    className="ml-4 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Remove cow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {cattleError && (
            <p className="text-sm text-destructive">{cattleError}</p>
          )}
          {cattleRegistered && (
            <p className="text-sm text-muted-foreground">
              Cattle registered successfully. Continue to review and publish.
            </p>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={isRegisteringCattle}
            >
              Back
            </Button>
            <Button
              onClick={handleContinueToReview}
              disabled={cowQueue.length === 0 || isRegisteringCattle}
            >
              {isRegisteringCattle ? "Registering Cattle..." : "Continue to Review"}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Publish ────────────────────────────────────────── */}
      {step === 3 && herdSnapshot && (
        <div className="space-y-4">
          {/* Herd summary */}
          <Card>
            <CardHeader>
              <CardTitle>Herd Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                {(
                  [
                    { label: "Lot Name", value: herdSnapshot.name },
                    { label: "Genetics", value: herdSnapshot.genetics_label },
                    { label: "Breed Code", value: herdSnapshot.breed_code },
                    { label: "Season", value: herdSnapshot.season },
                    {
                      label: "Listing Price",
                      value: `$${parseFloat(herdSnapshot.listing_price).toLocaleString()}`,
                    },
                    { label: "Head Count", value: herdSnapshot.head_count },
                  ] as { label: string; value: string }[]
                ).map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-0.5 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Cattle list */}
          <Card>
            <CardHeader>
              <CardTitle>Registered Cattle ({cowQueue.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {cowQueue.map((c) => (
                <div
                  key={c._queueId}
                  className="rounded-md border border-border bg-muted/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {c.animal_name || c.registration_number}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {c.sex_code}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {c.breed_code}
                    </Badge>
                    {c.is_genomic_enhanced && (
                      <Badge variant="secondary" className="text-xs">
                        GE
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reg: {c.registration_number} &bull; EID: 840
                    {c.official_id_suffix} &bull; DOB: {c.birth_date} &bull;{" "}
                    {c.weight_lbs} lbs
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isPublishing}>
              Back
            </Button>
            <Button onClick={handlePublish} disabled={cowQueue.length === 0 || isPublishing}>
              {isPublishing ? "Publishing Lot..." : "Publish Lot"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rancher;
