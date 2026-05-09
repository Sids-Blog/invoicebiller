<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Instructions - United Voyages Frontend

## 🎯 Project Overview

**United Voyages** is an **airline flight booking application** built with modern frontend technologies.

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.2.1 (App Router) |
| **React** | React 19.2.4 with strict TypeScript |
| **UI Library** | shadcn/ui (Radix UI primitives) |
| **Styling** | Tailwind CSS v4 with OKLCH colors |
| **Icons** | lucide-react |
| **Animations** | GSAP + Framer Motion |
| **3D** | Three.js + React Three Fiber |
| **State** | React hooks (useState, useContext) |

### Active Skills
- **shadcn/ui** - Component management and development best practices

---

## 📁 Project Structure Deep Dive

```
unitedvoyages/
│
├── app/
│   ├── page.tsx                    # 🎨 COMPONENT SHOWCASE (all 22+ components)
│   ├── layout.tsx                  # Root layout with TooltipProvider
│   ├── globals.css                 # Theme: OKLCH colors, CSS variables
│   └── [feature]/page.tsx          # Feature pages (use as examples)
│
├── components/
│   ├── ui/                         # shadcn/ui auto-generated (DON'T EDIT)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ... (20 more components)
│   │
│   ├── Hero.tsx                    # Custom hero with 3D scene
│   ├── BookingForm.tsx             # Flight search form
│   └── ThreeScene.tsx              # 3D scene component
│
├── lib/
│   └── utils.ts                    # cn() - Tailwind class merger
│
├── public/
│   └── Images/                     # Static assets
│       └── airstrip.png
│
├── .agents/
│   └── skills/
│       └── shadcn/                 # shadcn/ui skill (rules, patterns)
│           ├── SKILL.md
│           ├── mcp.md
│           ├── rules/
│           │   ├── styling.md
│           │   ├── forms.md
│           │   ├── composition.md
│           │   └── icons.md
│           └── evals/
│
├── components.json                 # shadcn configuration
├── COMPONENTS_GUIDE.md             # Component usage guide (10 examples)
├── SHOWCASE_README.md              # Showcase page documentation
├── .cursorrules                    # These frontend instructions
└── AGENTS.md                       # This file
```

---

## 🎨 Available Components (22+ Installed)

### Form Components
- **Input** - Text input fields
- **Label** - Form labels for accessibility
- **Select** - Dropdown selection
- **Checkbox** - Multi-select with states
- **RadioGroup** - Single selection from options
- **Textarea** - Multi-line text input

### Date & Time
- **Calendar** - Date picker UI
- **Popover** - Floating content wrapper

### Navigation & Layout
- **Tabs** - Tab switching interface
- **Breadcrumb** - Navigation breadcrumb trail
- **Accordion** - Expandable sections
- **Pagination** - Page navigation
- **Progress** - Progress indicator

### Display & Information
- **Card** - Container component (with Header, Content, Footer)
- **Badge** - Status/label indicators
- **Table** - Data table display
- **Alert** - Alert messages
- **Tooltip** - Hover information

### Overlays & Modals
- **Dialog** - Modal dialog box
- **Drawer** - Mobile-friendly side drawer
- **Sheet** - Side panel alternative
- **Skeleton** - Loading placeholder

**👉 See `COMPONENTS_GUIDE.md` for detailed examples of each component.**

---

## 🚀 Common Tasks & Patterns

### Task 1: Create a Flight Search Form

**File:** `components/FlightSearchForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface FormState {
  from: string
  to: string
  departDate: Date | undefined
  returnDate: Date | undefined
  tripType: 'oneway' | 'roundtrip'
  cabinClass: string
  passengers: string
}

export function FlightSearchForm() {
  const [formData, setFormData] = useState<FormState>({
    from: '',
    to: '',
    departDate: undefined,
    returnDate: undefined,
    tripType: 'roundtrip',
    cabinClass: 'economy',
    passengers: '1'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Searching flights:', formData)
    // Add search logic
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trip Type */}
      <RadioGroup value={formData.tripType} onValueChange={(val) => setFormData({...formData, tripType: val as 'oneway' | 'roundtrip'})}>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="oneway" id="oneway" />
            <Label htmlFor="oneway">One Way</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="roundtrip" id="roundtrip" />
            <Label htmlFor="roundtrip">Round Trip</Label>
          </div>
        </div>
      </RadioGroup>

      {/* From/To */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            placeholder="Departure city"
            value={formData.from}
            onChange={(e) => setFormData({...formData, from: e.target.value})}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            placeholder="Destination city"
            value={formData.to}
            onChange={(e) => setFormData({...formData, to: e.target.value})}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Depart Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full">
                {formData.departDate?.toDateString() || 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={formData.departDate}
                onSelect={(date) => setFormData({...formData, departDate: date})}
              />
            </PopoverContent>
          </Popover>
        </div>

        {formData.tripType === 'roundtrip' && (
          <div>
            <Label>Return Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full">
                  {formData.returnDate?.toDateString() || 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={formData.returnDate}
                  onSelect={(date) => setFormData({...formData, returnDate: date})}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Cabin & Passengers */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cabin">Cabin Class</Label>
          <Select value={formData.cabinClass} onValueChange={(val) => setFormData({...formData, cabinClass: val})}>
            <SelectTrigger id="cabin">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">Economy</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="first">First Class</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="passengers">Passengers</Label>
          <Select value={formData.passengers} onValueChange={(val) => setFormData({...formData, passengers: val})}>
            <SelectTrigger id="passengers">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} Passenger{num > 1 ? 's' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full">Search Flights</Button>
    </form>
  )
}
```

### Task 2: Display Flight Results in Table

**File:** `components/FlightResults.tsx`

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Flight {
  id: string
  airline: string
  departure: string
  arrival: string
  duration: string
  price: number
  status: 'on-time' | 'delayed' | 'boarding'
}

const flights: Flight[] = [
  { id: '1', airline: 'United', departure: '10:00 AM', arrival: '2:30 PM', duration: '4h 30m', price: 299, status: 'on-time' },
  { id: '2', airline: 'Delta', departure: '11:30 AM', arrival: '4:00 PM', duration: '4h 30m', price: 279, status: 'boarding' },
  { id: '3', airline: 'American', departure: '2:00 PM', arrival: '6:45 PM', duration: '4h 45m', price: 315, status: 'delayed' },
]

export function FlightResults() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Airline</TableHead>
          <TableHead>Departure</TableHead>
          <TableHead>Arrival</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flights.map((flight) => (
          <TableRow key={flight.id}>
            <TableCell className="font-medium">{flight.airline}</TableCell>
            <TableCell>{flight.departure}</TableCell>
            <TableCell>{flight.arrival}</TableCell>
            <TableCell>{flight.duration}</TableCell>
            <TableCell className="font-semibold">${flight.price}</TableCell>
            <TableCell>
              <Badge variant={flight.status === 'delayed' ? 'destructive' : 'outline'}>
                {flight.status === 'on-time' ? '✓ On Time' : flight.status === 'delayed' ? 'Delayed' : 'Boarding'}
              </Badge>
            </TableCell>
            <TableCell>
              <Button size="sm">Select</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Task 3: Create a Booking Confirmation Dialog

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BookingConfirmation() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Complete Booking</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Your Booking</DialogTitle>
          <DialogDescription>
            Review your flight details before proceeding to payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flight</span>
                <span className="font-medium">United Airlines UA123</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">April 15, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passengers</span>
                <span className="font-medium">2 Adults</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold">Total Price</span>
                <span className="text-lg font-bold text-primary">$598</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">Cancel</Button>
          <Button className="flex-1">Confirm & Pay</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🎯 Booking Flow Implementation

### Page 1: Search (Homepage)
- Components: FlightSearchForm, Card container
- State: Search filters (from, to, dates, etc.)
- Action: Submit to get flight results

### Page 2: Results
- Components: FlightResults (Table), Drawer/filters, Pagination
- State: Flight list, selected flight, filters
- Action: Select a flight to proceed

### Page 3: Seat Selection
- Components: Tabs (outbound/return), Grid layout, Checkbox
- State: Selected seats per flight
- Action: Proceed to passenger details

### Page 4: Passenger Details
- Components: Form (Input, Label), Card
- State: Passenger information (names, emails, etc.)
- Action: Proceed to payment

### Page 5: Confirmation
- Components: Card with summary, Dialog confirmation
- State: Booking details
- Action: Confirm booking

---

## 🎬 Animations with GSAP

### What is GSAP?
**GSAP** (GreenSock Animation Platform) is a powerful JavaScript animation library. Use it for:
- Complex animation sequences
- Timeline-based animations
- Scroll-triggered animations
- Staggered animations
- Performance-critical animations

### When to Use Each Library
```
GSAP:
  ✅ Flight results loading (staggered)
  ✅ Booking progress animation
  ✅ Scroll-triggered hero animations
  ✅ Complex sequences

Framer Motion:
  ✅ Modal entrance/exit
  ✅ Page transitions
  ✅ Component hover effects
  ✅ Simple state animations

Tailwind:
  ✅ Basic hover states
  ✅ Loading spinners
  ✅ Pulse/fade effects
```

### Basic GSAP Example
```tsx
'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function AnimatedFlightResults() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animate flight cards on load
    gsap.from(containerRef.current?.querySelectorAll('.flight-card'), {
      duration: 0.6,
      opacity: 0,
      y: 20,
      stagger: 0.1,  // 0.1s delay between each
      ease: 'power2.out'
    })
  }, [])

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="flight-card">Flight 1</div>
      <div className="flight-card">Flight 2</div>
      <div className="flight-card">Flight 3</div>
    </div>
  )
}
```

### Staggered List Animation
```tsx
'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function FlightList({ flights }: { flights: Flight[] }) {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    gsap.from(listRef.current?.querySelectorAll('li'), {
      duration: 0.6,
      opacity: 0,
      x: -20,
      stagger: 0.1,
      ease: 'power2.out'
    })
  }, [flights])

  return (
    <ul ref={listRef} className="space-y-2">
      {flights.map((flight) => (
        <li key={flight.id} className="p-4 bg-card rounded-lg">
          {flight.airline} - ${flight.price}
        </li>
      ))}
    </ul>
  )
}
```

### Timeline Animation (Multi-element)
```tsx
'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function BookingProgressAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Create timeline for sequential animations
    const tl = gsap.timeline()

    tl.from('.progress-title', { duration: 0.6, opacity: 0, y: -20 })
      .from('.progress-bar', { duration: 0.8, width: '0%' }, '-=0.3')
      .from('.progress-text', { duration: 0.6, opacity: 0 }, '-=0.3')
  }, [])

  return (
    <div ref={containerRef} className="space-y-4">
      <h2 className="progress-title">Booking Progress</h2>
      <div className="progress-bar h-2 bg-primary rounded-full w-0" />
      <p className="progress-text">Step 2 of 3: Select Seats</p>
    </div>
  )
}
```

### Interactive Click Animation
```tsx
'use client'

import { useRef } from 'react'
import gsap from 'gsap'

export function SelectSeat() {
  const seatRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    gsap.to(seatRef.current, {
      duration: 0.3,
      scale: 1.2,
      backgroundColor: '#00ff00',
      ease: 'back.out'
    })
  }

  return (
    <button
      ref={seatRef}
      onClick={handleClick}
      className="w-10 h-10 bg-gray-300 rounded hover:bg-gray-400"
    >
      A1
    </button>
  )
}
```

### Scroll-Triggered Animation
```tsx
'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function ScrollHeroAnimation() {
  useEffect(() => {
    gsap.to('.hero-title', {
      scrollTrigger: {
        trigger: '.hero-title',
        start: 'top 80%',
        end: 'top 20%',
        scrub: 1  // Smooth scrubbing
      },
      opacity: 1,
      y: 0,
      duration: 1
    })
  }, [])

  return <h1 className="hero-title opacity-0">Welcome to United Voyages</h1>
}
```

→ See `.cursor/rules/animations.md` for comprehensive GSAP guide

---

## 🎨 Theming & Styling

### OKLCH Color System (globals.css)
Your project uses OKLCH (perceptually uniform) colors:

```css
:root {
  /* Light mode - defined as oklch(lightness saturation hue) */
  --primary: oklch(0.488 0.243 264.376);           /* Purple/Blue */
  --secondary: oklch(0.967 0.001 286.375);        /* Light gray */
  --accent: oklch(0.488 0.243 264.376);           /* Same as primary */
  --destructive: oklch(0.577 0.245 27.325);       /* Red */
  --background: oklch(1 0 0);                     /* White */
  --foreground: oklch(0.145 0 0);                 /* Dark text */
  --card: oklch(1 0 0);                           /* White */
  --muted: oklch(0.97 0 0);                       /* Light gray */
}

.dark {
  /* Dark mode - same hues, different lightness */
  --primary: oklch(0.424 0.199 265.638);          /* Darker purple/blue */
  --background: oklch(0.145 0 0);                 /* Dark background */
  --foreground: oklch(0.985 0 0);                 /* Light text */
  --card: oklch(0.205 0 0);                       /* Dark card */
  --muted: oklch(0.269 0 0);                      /* Dark gray */
}
```

### Using Colors in Components
```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-primary text-primary-foreground">Primary background</div>
<p className="text-muted-foreground">Secondary text</p>
<button className="bg-destructive text-destructive-foreground">Delete</button>

// ❌ WRONG - Never use raw colors
<div className="bg-blue-500 text-white">
<button className="bg-red-600">
```

---

## 📝 Code Quality Checklist

Before submitting code, ensure:

### TypeScript
- [ ] No `any` types (use `unknown` or proper types)
- [ ] All functions have return types
- [ ] All props interfaces are defined
- [ ] Strict null checks pass

### Styling
- [ ] Only semantic color tokens used
- [ ] Proper spacing with `gap-*` (not `space-y-*`)
- [ ] All form fields have Labels
- [ ] Dark mode tested and working

### Components
- [ ] Uses shadcn/ui components (not raw HTML)
- [ ] Proper composition (SelectItem in SelectGroup)
- [ ] Dialog/Drawer has DialogTitle
- [ ] Accessible (keyboard navigation, aria labels)

### Performance & Accessibility
- [ ] No console errors or warnings
- [ ] Responsive design (mobile tested)
- [ ] Images optimized
- [ ] Lighthouse score acceptable

### Build & Test
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run dev` works locally
- [ ] All tests passing (if applicable)

---

## 🚦 Running Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check for linting errors
npm run lint

# View components (if added to package.json)
npm run showcase
```

---

## 📚 Key Resources

| Resource | Purpose |
|----------|---------|
| `COMPONENTS_GUIDE.md` | Full component reference with 10+ examples |
| `SHOWCASE_README.md` | Showcase page documentation |
| `app/page.tsx` | Live component examples (672 lines) |
| `.agents/skills/shadcn/SKILL.md` | shadcn best practices and rules |
| `globals.css` | Theme colors and CSS variables |
| `.cursorrules` | Frontend development guidelines |

---

**Last Updated:** 2026-03-30  
**Framework:** Next.js 16.2.1  
**React:** 19.2.4  
**Tailwind:** v4  
**shadcn/ui:** Latest
