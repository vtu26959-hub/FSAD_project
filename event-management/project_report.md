# EventSphere — Comprehensive Project Report

## Executive Summary
EventSphere is a full-stack, enterprise-grade Event Management and Ticketing platform. It allows users to browse campus events by department and category, securely book tickets with real-time concurrency control, receive digital QR tickets via email, and interact with a smart assistant to discover events. The platform features a premium, responsive dark-themed UI.

---

## 1. Technology Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Vanilla CSS utilizing CSS Variables for global theming, CSS Grid/Flexbox for layouts, and custom animations/glassmorphism effects.
- **Networking**: Axios for REST API communication.
- **Routing**: Custom state-based SPA routing (no external libraries like React Router used).

### Backend
- **Framework**: Java 17, Spring Boot 3.2
- **Data Access**: Spring Data JPA / Hibernate
- **Database**: MySQL (Relational DB)
- **Email**: `spring-boot-starter-mail` (JavaMailSender)
- **QR Code Generation**: `ZXing` (Zebra Crossing) core/javase libraries

---

## 2. Core Features & Functions

- **Smart Event Assistant**: A built-in, rule-based AI chatbot widget that uses regex and keyword matching to help users dynamically filter events by price, popularity, availability, and department without needing a backend AI API.
- **Real-Time Ticket Locking**: A concurrency control system that temporarily "locks" tickets for 60 seconds when a user initiates a booking, preventing double-booking of the same seat.
- **Digital QR Ticketing**: Generates base64-encoded QR codes containing a direct URL. When scanned via mobile, it instantly routes the user to a secure Digital Ticket Verification page.
- **Asynchronous Email Dispatch**: Automatically sends rich HTML confirmation emails with embedded ticket details in a background thread (`@Async`), ensuring the user's booking flow isn't slowed down by network latency.
- **Admin Dashboard**: Role-based access control allowing `ADMIN` users to create new events, assign them to departments, and set ticket capacities.

---

## 3. Database Architecture (Entities)

The system relies on three core entities mapped to MySQL via JPA:

1. **User**
   - `id` (Long, PK)
   - `name`, `email`, `password` (String)
   - `role` (Enum: `USER`, `ADMIN`)
2. **Event**
   - `id` (Long, PK)
   - `name`, `category`, `department`, `venue`, `description`, `imageUrl` (String)
   - `dateTime` (LocalDateTime)
   - `ticketPrice` (BigDecimal)
   - `totalTickets`, `availableTickets` (Integer)
   - `popularityScore` (Integer - used for trending metrics)
3. **Booking**
   - `id` (Long, PK)
   - `bookingId` (String, unique alphanumeric identifier, e.g., `BKG-4C4D8C1F`)
   - `event` (ManyToOne mapping)
   - `user` (ManyToOne mapping)
   - `ticketsBooked` (Integer)
   - `totalPrice` (BigDecimal)
   - `bookingDate` (LocalDateTime)

---

## 4. Backend Architecture (Spring Boot)

### Controllers & Routes
- **`AuthController`**
  - `POST /api/auth/register`: Creates new user accounts.
  - `POST /api/auth/login`: Authenticates credentials and returns user details.
- **`EventController`**
  - `GET /api/events`: Fetches all events.
  - `GET /api/events/department/{dept}`: Fetches filtered events.
  - `POST /api/events`: Admin endpoint to create events.
  - `GET /api/bookings/{bookingId}`: Dedicated endpoint for the QR verification page to fetch ticket details securely.
- **`BookingController`**
  - `POST /api/bookings/lock`: Initiates the 60-second ticket lock.
  - `POST /api/bookings/unlock`: Manually releases a lock.
  - `POST /api/bookings/book`: Finalizes the transaction, deducts tickets, generates QR, and triggers emails.
  - `GET /api/bookings/user/{userId}`: Retrieves a user's booking history.

### Services (Business Logic)
- **`EventService`**: The core engine. It manages the `ConcurrentHashMap` used for ticket locking. It handles the mathematical deduction of `availableTickets`. It also constructs the Verification URL and calls the QR service.
- **`EmailService`**: Uses an `@Async` method to compile HTML strings containing inline CSS and injects booking data variables before dispatching via Gmail SMTP.
- **`QRCodeService`**: Utilizes `MatrixToImageWriter` to generate a pixel matrix representing the URL, converting it into a Base64 PNG string so it can be transmitted via JSON and rendered directly in `<img>` tags on the frontend.

---

## 5. Frontend Architecture (React)

### State Management & Routing (`App.jsx`)
Instead of `react-router-dom`, the app orchestrates navigation using a centralized `view` state variable (`home | login | register | departments | browse | detail | admin | summary | verify`).
It intelligently intercepts URLs via `window.location.pathname.startsWith('/verify/')` on mount to natively handle QR code scans.

### Key Components
1. **`EventAssistant.jsx`**: A floating widget containing a `buildQueryEngine`. It holds a massive dictionary of keywords (e.g., *cheapest, viral, workshops, seats left*) and filters the `allEvents` array in memory to return customized Chatbot responses and inline event cards.
2. **`TicketVerification.jsx`**: Displays a visually striking "Digital Pass" UI. It fetches data from the backend using the intercepted `bookingId` from the URL, showing a glowing "Verified" badge or an "Invalid Ticket" error card.
3. **`BookingForm.jsx`**: Handles user input for ticket quantities and interfaces with the backend locking mechanism.
4. **`App.css`**: Contains over 500 lines of highly optimized, custom CSS. It enforces a strict dark theme (blacks, dark grays) heavily accented with warm colors (oranges, yellows) using CSS variables. It features extensive keyframe animations (`fadeInUp`, `pulse`, `springSlide`) and UI glassmorphism techniques.

---

## 6. Complex Workflows

### The Booking & Locking Flow
1. User selects 2 tickets and clicks "Book".
2. Frontend hits `/api/bookings/lock`. Backend checks `availableTickets`. If enough exist, a temporary lock is stored in a `ConcurrentHashMap` with an expiry timestamp.
3. Frontend starts a 60-second visual SVG ring countdown.
4. User clicks "Confirm". Frontend hits `/api/bookings/book`.
5. Backend verifies the lock, creates the `Booking` record, deducts `availableTickets`, saves to DB, creates the QR Code, and spins off a background thread to email the user.
6. Frontend receives the QR Code and shows the `BookingSummary` success screen.

### The Verification Flow
1. User arrives at the venue and shows their phone.
2. Security scans the QR code. The QR code contains `http://localhost:3000/verify/BKG-ABCD`.
3. The scanner app opens the browser. `App.jsx` intercepts `/verify/BKG-ABCD`.
4. It bypasses the login screen (unauthenticated access permitted) and mounts `TicketVerification`.
5. The component fetches the ticket data and proves authenticity visually.
