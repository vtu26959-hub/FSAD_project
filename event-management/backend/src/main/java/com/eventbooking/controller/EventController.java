package com.eventbooking.controller;

import com.eventbooking.model.Event;
import com.eventbooking.model.Booking;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.service.EventService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class EventController {

    @Autowired
    private EventService eventService;

    @Autowired
    private BookingRepository bookingRepository;

    // ========================
    // EVENT ENDPOINTS
    // ========================

    /**
     * GET /api/event
     * Returns the first event (backwards-compatible).
     */
    @GetMapping("/event")
    public ResponseEntity<?> getEvent() {
        try {
            Event event = eventService.getEvent();
            if (event == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No event found"));
            }
            return ResponseEntity.ok(event);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch event: " + e.getMessage()));
        }
    }

    /**
     * GET /api/events
     * Returns all events.
     */
    @GetMapping("/events")
    public ResponseEntity<?> getAllEvents() {
        try {
            List<Event> events = eventService.getAllEvents();
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch events: " + e.getMessage()));
        }
    }

    /**
     * GET /api/events/{id}
     * Returns a single event by ID.
     */
    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEventById(@PathVariable Long id) {
        try {
            Event event = eventService.getEventById(id);
            if (event == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Event not found"));
            }
            return ResponseEntity.ok(event);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch event: " + e.getMessage()));
        }
    }

    /**
     * GET /api/events/categories
     * Returns all distinct category names.
     */
    @GetMapping("/events/categories")
    public ResponseEntity<?> getCategories() {
        try {
            List<String> categories = eventService.getCategories();
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch categories: " + e.getMessage()));
        }
    }

    /**
     * GET /api/events/category/{category}
     * Returns events by category.
     */
    @GetMapping("/events/category/{category}")
    public ResponseEntity<?> getEventsByCategory(@PathVariable String category) {
        try {
            List<Event> events = eventService.getEventsByCategory(category);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch events: " + e.getMessage()));
        }
    }

    /**
     * GET /api/events/department/{department}
     * Returns events by department.
     */
    @GetMapping("/events/department/{department}")
    public ResponseEntity<?> getEventsByDepartment(@PathVariable String department) {
        try {
            List<Event> events = eventService.getEventsByDepartment(department);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch events: " + e.getMessage()));
        }
    }

    // ========================
    // ADMIN ENDPOINTS
    // ========================

    /**
     * POST /api/events
     * Add a new event (admin).
     */
    @PostMapping("/events")
    public ResponseEntity<?> addEvent(@RequestBody Map<String, Object> request) {
        try {
            Event event = new Event();
            event.setName((String) request.get("name"));
            event.setDepartment((String) request.getOrDefault("department", "General"));
            event.setCategory((String) request.getOrDefault("category", "Technical"));
            event.setVenue((String) request.getOrDefault("venue", "Main Hall"));
            event.setImageUrl((String) request.getOrDefault("imageUrl", ""));
            event.setDescription((String) request.getOrDefault("description", ""));
            event.setTicketPrice(new BigDecimal(request.getOrDefault("ticketPrice", "100").toString()));

            int totalTickets = Integer.parseInt(request.getOrDefault("totalTickets", "100").toString());
            event.setTotalTickets(totalTickets);
            event.setAvailableTickets(totalTickets);

            // Parse dateTime or default to a future date
            if (request.containsKey("dateTime")) {
                event.setDateTime(LocalDateTime.parse(request.get("dateTime").toString()));
            } else {
                event.setDateTime(LocalDateTime.now().plusDays(30));
            }

            Event saved = eventService.addEvent(event);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Failed to add event: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/events/{id}
     * Delete an event (admin).
     */
    @DeleteMapping("/events/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        try {
            eventService.deleteEvent(id);
            return ResponseEntity.ok(Map.of("message", "Event deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete event: " + e.getMessage()));
        }
    }

    // ========================
    // TICKET LOCK & BOOKING
    // ========================

    /**
     * POST /api/lock
     * Temporarily lock/reserve tickets for 30 seconds.
     * Body: { "eventId": 1, "tickets": 3 }
     */
    @PostMapping("/lock")
    public ResponseEntity<?> lockTickets(@RequestBody Map<String, Object> request) {
        try {
            Long eventId = Long.parseLong(request.get("eventId").toString());
            int tickets = Integer.parseInt(request.getOrDefault("tickets", "0").toString());
            Map<String, Object> result = eventService.lockTickets(eventId, tickets);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/lock/{lockId}
     * Release a ticket lock.
     */
    @DeleteMapping("/lock/{lockId}")
    public ResponseEntity<?> releaseLock(@PathVariable String lockId) {
        try {
            eventService.releaseLock(lockId);
            return ResponseEntity.ok(Map.of("message", "Lock released successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to release lock: " + e.getMessage()));
        }
    }

    /**
     * POST /api/book
     * Complete a booking with a valid lock.
     * Body: { "name", "email", "department", "ticketsBooked", "lockId" }
     */
    @PostMapping("/book")
    public ResponseEntity<?> bookTickets(@RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String email = (String) request.get("email");
            String department = (String) request.get("department");
            int ticketsBooked = request.get("ticketsBooked") instanceof Integer
                    ? (Integer) request.get("ticketsBooked")
                    : Integer.parseInt(request.get("ticketsBooked").toString());
            String lockId = (String) request.get("lockId");

            if (lockId == null || lockId.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Lock ID is required. Please initiate booking first."));
            }

            Map<String, Object> result = eventService.completeBooking(
                    name, email, department, ticketsBooked, lockId);
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Booking failed: " + e.getMessage()));
        }
    }

    /**
     * GET /api/bookings/{bookingId}
     * Fetch a booking and its event by the alphanumeric booking ID.
     */
    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<?> getBookingById(@PathVariable String bookingId) {
        try {
            return bookingRepository.findByBookingId(bookingId)
                    .map(booking -> {
                        Event event = eventService.getEventById(booking.getEventId());
                        java.util.Map<String, Object> response = new java.util.HashMap<>();
                        response.put("booking", booking);
                        response.put("event", event);
                        return ResponseEntity.ok((Object) response);
                    })
                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("error", "Booking not found")));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to retrieve booking: " + e.getMessage()));
        }
    }
}
