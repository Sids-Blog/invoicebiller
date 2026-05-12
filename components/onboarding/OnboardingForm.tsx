"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { dbUtils } from "@/lib/db-utils";

const STEPS = [
  { id: "personal", title: "Personal Info" },
  { id: "professional", title: "Background" },
  { id: "goals", title: "Website Goals" },
  { id: "design", title: "Design" },
  { id: "timeline", title: "Budget & Timeline" },
  { id: "requirements", title: "Requirements" },
];

export function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    profession: "",
    company: "",
    websiteGoals: "",
    designStyle: "modern",
    budget: "",
    timeline: "",
    features: [] as string[],
    additionalRequirements: "",
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName.trim() !== "" && formData.email.trim() !== "";
      case 1:
        return formData.profession.trim() !== "";
      case 2:
        return formData.websiteGoals.trim() !== "";
      case 3:
        return formData.designStyle !== "";
      case 4:
        return formData.budget !== "" && formData.timeline !== "";
      case 5:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (isStepValid() && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else if (!isStepValid()) {
      toast.error("Please fill in all required fields.");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!isStepValid()) return;
    
    setIsSubmitting(true);
    try {
      // Here we would typically save to the database using dbUtils
      // Example: await dbUtils.insert("onboarding_responses", formData);
      
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Onboarding complete! We'll be in touch soon.");
      
      // Optionally redirect or show success state
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300",
                  index < currentStep ? "bg-primary text-primary-foreground" : 
                  index === currentStep ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : 
                  "bg-muted text-muted-foreground"
                )}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </div>
            </div>
          ))}
          {/* Connecting line */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-muted -z-0 mx-[5%]" />
          <div 
            className="absolute left-0 top-4 h-0.5 bg-primary -z-0 mx-[5%] transition-all duration-300"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 90}%` }}
          />
        </div>
        <div className="text-center mt-6">
          <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
          <p className="text-muted-foreground mt-1">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      </div>

      <Card className="border-border/50 shadow-lg relative overflow-hidden min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex-1 flex flex-col"
          >
            <CardContent className="pt-6 flex-1 space-y-6">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => updateForm("firstName", e.target.value)} placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => updateForm("lastName", e.target.value)} placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="john@example.com" />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession / Industry *</Label>
                    <Input id="profession" value={formData.profession} onChange={(e) => updateForm("profession", e.target.value)} placeholder="e.g. Graphic Designer, E-commerce" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name (Optional)</Label>
                    <Input id="company" value={formData.company} onChange={(e) => updateForm("company", e.target.value)} placeholder="Acme Corp" />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goals">What is the primary goal of your website? *</Label>
                    <Textarea 
                      id="goals" 
                      value={formData.websiteGoals} 
                      onChange={(e) => updateForm("websiteGoals", e.target.value)} 
                      placeholder="e.g. Generate leads, sell products online, showcase portfolio..."
                      className="min-h-[120px]"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <Label>Preferred Design Style *</Label>
                  <RadioGroup value={formData.designStyle} onValueChange={(v) => updateForm("designStyle", v)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: "modern", label: "Modern & Minimal", desc: "Clean lines, lots of whitespace" },
                      { id: "bold", label: "Bold & Vibrant", desc: "Strong colors, high contrast" },
                      { id: "corporate", label: "Professional / Corporate", desc: "Trustworthy, structured" },
                      { id: "playful", label: "Playful & Creative", desc: "Fun illustrations, dynamic" }
                    ].map((style) => (
                      <div key={style.id} className="relative">
                        <RadioGroupItem value={style.id} id={style.id} className="peer sr-only" />
                        <Label
                          htmlFor={style.id}
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                        >
                          <span className="font-semibold">{style.label}</span>
                          <span className="text-xs text-muted-foreground mt-1">{style.desc}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Estimated Budget *</Label>
                    <Select value={formData.budget} onValueChange={(v) => updateForm("budget", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_1k">Under $1,000</SelectItem>
                        <SelectItem value="1k_to_5k">$1,000 - $5,000</SelectItem>
                        <SelectItem value="5k_to_10k">$5,000 - $10,000</SelectItem>
                        <SelectItem value="over_10k">$10,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Desired Timeline *</Label>
                    <Select value={formData.timeline} onValueChange={(v) => updateForm("timeline", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a timeline" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asap">ASAP (Rush)</SelectItem>
                        <SelectItem value="1_month">1 Month</SelectItem>
                        <SelectItem value="2_3_months">2 - 3 Months</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <Label>Required Features (Check all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {["E-commerce / Store", "Blog / News", "User Accounts", "Booking System", "Contact Form", "Newsletter Integration"].map((feature) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`feat-${feature}`} 
                          checked={formData.features.includes(feature)}
                          onCheckedChange={() => toggleFeature(feature)}
                        />
                        <Label htmlFor={`feat-${feature}`} className="font-normal cursor-pointer">{feature}</Label>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 mt-6">
                    <Label htmlFor="additional">Any other requirements?</Label>
                    <Textarea 
                      id="additional" 
                      value={formData.additionalRequirements} 
                      onChange={(e) => updateForm("additionalRequirements", e.target.value)} 
                      placeholder="Anything else we should know?"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto border-t bg-muted/10 p-4 sm:px-6 flex justify-between items-center z-10">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 rounded-xl transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            type="button"
            onClick={currentStep === STEPS.length - 1 ? handleSubmit : nextStep}
            disabled={isSubmitting}
            className={cn(
              "flex items-center gap-2 rounded-xl transition-all",
              currentStep === STEPS.length - 1 ? "bg-primary text-primary-foreground" : ""
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : currentStep === STEPS.length - 1 ? (
              <><Check className="w-4 h-4" /> Finish</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
