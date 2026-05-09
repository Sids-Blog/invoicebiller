# API Patterns & Server Actions Documentation

**United Voyages - Next.js 16 Backend Architecture Guide**

---

## Table of Contents
1. [Overview](#overview)
2. [API Building Approaches](#api-building-approaches)
3. [Server Actions vs API Routes](#server-actions-vs-api-routes)
4. [Implementation Recommendations](#implementation-recommendations)
5. [Code Examples](#code-examples)

---

## Overview

This document outlines the recommended patterns for building APIs and handling data mutations in the United Voyages Next.js 16 application. The app uses the App Router and Tailwind CSS for styling, with server-side components and client components using React hooks.

**Key Decision:** Use **Server Actions** for form submissions and mutations (like flight bookings) and **API Routes** for webhooks, external integrations, and public APIs.

---

## API Building Approaches

### 1. **API Routes (App Router)**
Direct HTTP endpoints for traditional REST API patterns.

```typescript
// app/api/flights/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const flights = await db.query('SELECT * FROM flights')
    return NextResponse.json(flights)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const flight = await db.flight.create({ data })
  return NextResponse.json(flight, { status: 201 })
}
```

**Use Cases:**
- Public APIs
- Third-party integrations
- Mobile app backends
- Webhook handlers
- Complex query parameters

---

### 2. **Server Actions (Recommended for Forms)**
Direct function calls from client components that execute on the server.

```typescript
// app/actions/booking.ts
'use server'

import { db } from '@/lib/db'

export async function createBooking(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const from = formData.get('from') as string
  const to = formData.get('to') as string
  const departDate = formData.get('departDate') as string

  try {
    const booking = await db.booking.create({
      data: {
        fullName,
        phone,
        from,
        to,
        departDate: new Date(departDate),
      }
    })
    return { success: true, bookingId: booking.id }
  } catch (error) {
    return { success: false, error: 'Failed to create booking' }
  }
}
```

**Usage in Component:**
```typescript
// app/components/home/horizon-booking-form.tsx
'use client'

import { createBooking } from '@/app/actions/booking'

export function HorizonBookingForm() {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    // Call Server Action directly
    const result = await createBooking(formData)
    
    if (result.success) {
      // Show success message
    } else {
      // Show error message
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

**Or with Form Action:**
```typescript
// Even simpler with native form action
<form action={createBooking}>
  <input name="fullName" required />
  <input name="phone" required />
  <button type="submit">Book Flight</button>
</form>
```

**Use Cases:**
- Form submissions (booking form)
- Simple mutations (create, update, delete)
- Accessing session/authentication
- File uploads
- Real-time mutations without page navigation

---

### 3. **Prisma ORM (Type-Safe Database Access)**
The recommended approach for database interactions in both Server Actions and API Routes.

**Setup:**
```bash
npm install @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init

# Create database schema and run migrations
npx prisma migrate dev --name init
```

**Schema Example (prisma/schema.prisma):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Booking {
  id        String   @id @default(cuid())
  fullName  String
  phone     String
  from      String
  to        String
  departDate DateTime
  returnDate DateTime?
  tripType  String   @default("round-trip")
  flightClass String @default("economy")
  adults    Int      @default(1)
  children  Int      @default(0)
  infants   Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Flight {
  id            String   @id @default(cuid())
  airline       String
  departure     String
  arrival       String
  duration      String
  price         Float
  status        String   @default("on-time")
  availableSeats Int
  cabinClass    String
  createdAt     DateTime @default(now())
}
```

**Usage in Server Actions:**
```typescript
'use server'

import { prisma } from '@/lib/prisma'

export async function createBooking(formData: FormData) {
  const booking = await prisma.booking.create({
    data: {
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
      from: formData.get('from') as string,
      to: formData.get('to') as string,
      departDate: new Date(formData.get('departDate') as string),
      tripType: formData.get('tripType') as string,
      flightClass: formData.get('flightClass') as string,
      adults: parseInt(formData.get('adults') as string),
      children: parseInt(formData.get('children') as string),
      infants: parseInt(formData.get('infants') as string),
    }
  })
  return booking
}
```

---

### 4. **Connection Pooling (Production)**
For production databases, implement connection pooling to prevent exhausting database connections.

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Alternative with pg library:**
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
})

export default pool
```

---

## Server Actions vs API Routes

### Comparison Table

| Aspect | Server Actions | API Routes |
|--------|---|---|
| **Call Method** | Direct function call | HTTP fetch/request |
| **Network Transport** | RPC (hidden) | Explicit HTTP |
| **Serialization** | Automatic | Manual JSON stringify/parse |
| **Return Type** | Direct value | JSON response |
| **Error Handling** | Thrown errors | HTTP status codes |
| **Authentication** | Direct session access | Manual header/cookie parsing |
| **CORS** | Not needed | Required for cross-origin |
| **Caching** | Not HTTP-cacheable | HTTP cache headers supported |
| **Debugging** | Hidden (harder) | Visible in Network tab |
| **External Access** | Only from Next.js app | Any HTTP client |
| **Webhooks** | Not applicable | Ideal for webhooks |
| **Bundle Size** | Smaller | Larger (HTTP client) |
| **Latency** | Lower (no HTTP overhead) | Slightly higher |

---

### Pros and Cons

#### **Server Actions - Advantages ✅**
- **Minimal boilerplate** - No route file setup needed
- **Type-safe** - Full TypeScript support end-to-end
- **Form-friendly** - Native `<form action>` integration
- **Session access** - Direct access to authentication
- **No serialization** - React handles it automatically
- **Smaller bundle** - No HTTP client code shipped
- **Faster** - No network round-trip overhead for simple mutations
- **Automatic validation** - Easy to add form validation

#### **Server Actions - Disadvantages ❌**
- **Not HTTP-cacheable** - Can't use browser cache headers
- **Hard to debug** - Network requests are hidden from DevTools
- **No external access** - Only callable from Next.js app
- **CORS not applicable** - Can't be called from other domains
- **Limited streaming** - Less control over response streaming
- **Poor tooling** - Can't test easily with Postman/curl
- **Not RESTful** - Doesn't follow REST standards
- **Vendor-specific** - Next.js feature (potential lock-in)

---

#### **API Routes - Advantages ✅**
- **Standard HTTP** - Works with any client (mobile, desktop, external services)
- **HTTP caching** - Can use cache headers and CDN
- **Easy debugging** - Visible in browser Network tab, Postman, curl
- **RESTful** - Follows REST conventions and standards
- **Rate limiting** - Easy middleware integration
- **Webhooks** - External services can call your endpoints
- **Public APIs** - Easy to expose for third-party integrations
- **Language-agnostic** - Not vendor-specific
- **Monitoring** - Better observability and analytics

#### **API Routes - Disadvantages ❌**
- **More boilerplate** - Need explicit request/response handling
- **Serialization overhead** - Manual JSON stringify/parse
- **CORS complexity** - Need to handle cross-origin requests
- **Larger bundle** - HTTP client code in browser
- **Network latency** - Extra round-trip (though usually minimal)
- **Manual error handling** - Must manage HTTP status codes
- **Type-safety concerns** - Less type checking at runtime

---

## Implementation Recommendations

### For United Voyages

**Architecture Strategy:**
```
Client Components (HorizonBookingForm, etc.)
        ↓
Server Actions (createBooking, updatePassenger)
        ↓
Prisma ORM
        ↓
PostgreSQL Database
```

**Additionally:**
```
External Services (Stripe, Payment Gateway)
        ↓
API Routes (/api/webhooks/payment)
        ↓
Prisma ORM
        ↓
PostgreSQL Database
```

### Layer Breakdown

#### **1. Server Actions Layer (for forms)**
Location: `app/actions/`

```
app/
├── actions/
│   ├── booking.ts (createBooking, updateBooking, cancelBooking)
│   ├── passenger.ts (addPassenger, updatePassenger)
│   └── payment.ts (initiatePayment)
```

#### **2. API Routes Layer (for integrations)**
Location: `app/api/`

```
app/
├── api/
│   ├── webhooks/
│   │   ├── payment/route.ts (Stripe webhook)
│   │   └── email/route.ts (Email service webhook)
│   ├── public/
│   │   └── flights/route.ts (Public flights list)
│   └── admin/
│       └── stats/route.ts (Admin dashboard API)
```

#### **3. Database Layer**
Location: `lib/db.ts` and `prisma/`

```
lib/
└── db.ts (Prisma client singleton)

prisma/
├── schema.prisma (Data models)
└── migrations/ (Database migrations)
```

---

## Code Examples

### Example 1: Booking Form with Server Action

**Server Action (app/actions/booking.ts):**
```typescript
'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createBooking(formData: FormData) {
  try {
    const booking = await prisma.booking.create({
      data: {
        fullName: formData.get('fullName') as string,
        phone: formData.get('phone') as string,
        from: formData.get('from') as string,
        to: formData.get('to') as string,
        departDate: new Date(formData.get('departDate') as string),
        returnDate: formData.get('returnDate') 
          ? new Date(formData.get('returnDate') as string)
          : null,
        tripType: formData.get('tripType') as string,
        flightClass: formData.get('flightClass') as string,
        adults: parseInt(formData.get('adults') as string),
        children: parseInt(formData.get('children') as string),
        infants: parseInt(formData.get('infants') as string),
      }
    })

    revalidatePath('/bookings')
    return { success: true, bookingId: booking.id }
  } catch (error) {
    console.error('Booking error:', error)
    return { success: false, error: 'Failed to create booking' }
  }
}
```

**Component (components/home/horizon-booking-form.tsx):**
```typescript
'use client'

import { createBooking } from '@/app/actions/booking'
import { useState } from 'react'

export function HorizonBookingForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await createBooking(formData)

    setLoading(false)

    if (result.success) {
      // Show success
      console.log('Booking created:', result.bookingId)
    } else {
      // Show error
      console.error('Error:', result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Your existing form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Booking...' : 'Book My Flight'}
      </button>
    </form>
  )
}
```

---

### Example 2: Webhook API Route

**API Route (app/api/webhooks/payment/route.ts):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const event = await request.json()

    // Verify webhook signature (important for security)
    const signature = request.headers.get('x-signature')
    // Verify signature...

    // Handle different webhook events
    if (event.type === 'payment.success') {
      const booking = await prisma.booking.update({
        where: { id: event.bookingId },
        data: { status: 'confirmed', paymentId: event.paymentId }
      })

      return NextResponse.json(
        { success: true, booking },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: 'Unknown event type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
```

---

### Example 3: Public API Route

**API Route (app/api/flights/route.ts):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const date = searchParams.get('date')

    const flights = await prisma.flight.findMany({
      where: {
        from: from || undefined,
        to: to || undefined,
        // Add date filtering logic
      },
      take: 20, // Limit results
    })

    return NextResponse.json(
      { flights },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        }
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch flights' },
      { status: 500 }
    )
  }
}
```

---

## Best Practices

### ✅ Do's
- **Use Server Actions** for all form submissions in your booking form
- **Use API Routes** only for webhooks and external integrations
- **Validate input** in both Server Actions and API Routes
- **Use Prisma** for all database interactions
- **Handle errors gracefully** with appropriate status codes
- **Implement authentication** checks in both patterns
- **Use revalidatePath()** to update cached data after mutations
- **Add type safety** with TypeScript interfaces

### ❌ Don'ts
- Don't expose sensitive logic in API Routes
- Don't skip input validation
- Don't use raw SQL queries (use Prisma instead)
- Don't forget to handle errors
- Don't mix async/await patterns inconsistently
- Don't expose database errors to clients
- Don't skip CORS headers when needed

---

## Migration Path

If you start with Server Actions and later need to expose an API:

1. Extract database logic to a shared utility
2. Create an API Route wrapper around the logic
3. Both Server Action and API Route call the shared utility

```typescript
// lib/bookings.ts (Shared logic)
export async function createBookingLogic(data: BookingInput) {
  return prisma.booking.create({ data })
}

// app/actions/booking.ts (Server Action)
'use server'
export async function createBooking(formData: FormData) {
  return createBookingLogic({ /* map formData */ })
}

// app/api/bookings/route.ts (API Route - future)
export async function POST(request: NextRequest) {
  const data = await request.json()
  return NextResponse.json(await createBookingLogic(data))
}
```

---

## References

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Setup](https://www.postgresql.org/docs/)

---

**Last Updated:** April 2026
**Version:** 1.0
**Project:** United Voyages
