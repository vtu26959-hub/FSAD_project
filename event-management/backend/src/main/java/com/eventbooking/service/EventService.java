package com.eventbooking.service;

import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EventService {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private QRCodeService qrCodeService;

    @Autowired
    private EmailService emailService;

    @Value("${frontend.url:http://localhost:3000}")
    private String frontendUrl;

    // Ticket lock storage: lockId -> LockInfo
    private final ConcurrentHashMap<String, LockInfo> ticketLocks = new ConcurrentHashMap<>();

    private static final long LOCK_DURATION_SECONDS = 30;

    // Inner class to hold lock information
    private static class LockInfo {
        final Long eventId;
        final int tickets;
        final Instant expiresAt;

        LockInfo(Long eventId, int tickets, Instant expiresAt) {
            this.eventId = eventId;
            this.tickets = tickets;
            this.expiresAt = expiresAt;
        }
    }

    // ========================
    // EVENT QUERIES
    // ========================

    /**
     * Fetch all events.
     */
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    /**
     * Fetch a single event by ID.
     */
    public Event getEventById(Long id) {
        return eventRepository.findById(id).orElse(null);
    }

    /**
     * Fetch the first event (backwards-compatible).
     */
    public Event getEvent() {
        List<Event> events = eventRepository.findAll();
        if (events.isEmpty()) {
            return null;
        }
        return events.get(0);
    }

    /**
     * Fetch events by category.
     */
    public List<Event> getEventsByCategory(String category) {
        return eventRepository.findByCategory(category);
    }

    /**
     * Fetch events by department.
     */
    public List<Event> getEventsByDepartment(String department) {
        return eventRepository.findByDepartment(department);
    }

    /**
     * Fetch all distinct categories.
     */
    public List<String> getCategories() {
        return eventRepository.findDistinctCategories();
    }

    /**
     * Add a new event (admin).
     */
    @Transactional
    public Event addEvent(Event event) {
        return eventRepository.save(event);
    }

    /**
     * Delete an event by ID (admin).
     */
    @Transactional
    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new RuntimeException("Event not found with ID: " + id);
        }
        eventRepository.deleteById(id);
    }

    // ========================
    // TICKET LOCK & BOOKING
    // ========================

    /**
     * Lock tickets temporarily for 30 seconds on a specific event.
     */
    @Transactional
    public Map<String, Object> lockTickets(Long eventId, int tickets) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        if (tickets <= 0) {
            throw new IllegalArgumentException("Number of tickets must be greater than 0");
        }

        if (tickets > event.getAvailableTickets()) {
            throw new IllegalArgumentException(
                    "Not enough tickets available. Only " + event.getAvailableTickets() + " tickets remaining.");
        }

        // Decrement available tickets (reserve them)
        event.setAvailableTickets(event.getAvailableTickets() - tickets);
        eventRepository.save(event);

        // Create lock
        String lockId = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(LOCK_DURATION_SECONDS);
        ticketLocks.put(lockId, new LockInfo(event.getId(), tickets, expiresAt));

        Map<String, Object> response = new HashMap<>();
        response.put("lockId", lockId);
        response.put("lockedTickets", tickets);
        response.put("expiresInSeconds", LOCK_DURATION_SECONDS);
        response.put("event", event);
        return response;
    }

    /**
     * Release a ticket lock manually (e.g., user cancels).
     */
    @Transactional
    public void releaseLock(String lockId) {
        LockInfo lock = ticketLocks.remove(lockId);
        if (lock != null) {
            Event event = eventRepository.findById(lock.eventId).orElse(null);
            if (event != null) {
                event.setAvailableTickets(event.getAvailableTickets() + lock.tickets);
                eventRepository.save(event);
            }
        }
    }

    /**
     * Complete a booking using a lock.
     */
    @Transactional
    public Map<String, Object> completeBooking(String name, String email,
                                                String department, int ticketsBooked,
                                                String lockId) {
        // Validate inputs
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (email == null || !email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new IllegalArgumentException("Valid email is required");
        }
        if (department == null || department.trim().isEmpty()) {
            throw new IllegalArgumentException("Department is required");
        }
        if (ticketsBooked <= 0) {
            throw new IllegalArgumentException("Number of tickets must be greater than 0");
        }

        // Validate lock
        LockInfo lock = ticketLocks.get(lockId);
        if (lock == null) {
            throw new RuntimeException("Lock expired or not found. Please try booking again.");
        }

        // Check if lock has expired
        if (Instant.now().isAfter(lock.expiresAt)) {
            releaseLock(lockId);
            throw new RuntimeException("Lock has expired. Tickets have been released. Please try again.");
        }

        // Verify ticket count matches lock
        if (ticketsBooked != lock.tickets) {
            throw new IllegalArgumentException("Ticket count does not match locked tickets");
        }

        // Remove the lock (tickets already decremented during lock)
        ticketLocks.remove(lockId);

        // Get the event
        Event event = eventRepository.findById(lock.eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Generate Booking ID
        String bookingId = "BKG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Generate QR Code content as Verification URL
        String qrData = frontendUrl + "/verify/" + bookingId;
        String qrCodeBase64 = qrCodeService.generateQRCodeBase64(qrData, 300, 300);

        // Save booking
        Booking booking = new Booking(bookingId, name.trim(), email.trim(),
                department.trim(), ticketsBooked, event.getId());
        bookingRepository.save(booking);

        // Send Email Confirmation
        emailService.sendBookingConfirmation(booking, event, qrCodeBase64);

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Booking successful!");
        response.put("booking", booking);
        response.put("event", event);
        response.put("qrCode", qrCodeBase64);
        response.put("emailStatus", "Email queued for delivery");
        return response;
    }

    /**
     * Scheduled task: release expired locks every 5 seconds.
     */
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void releaseExpiredLocks() {
        Instant now = Instant.now();
        Iterator<Map.Entry<String, LockInfo>> iterator = ticketLocks.entrySet().iterator();

        while (iterator.hasNext()) {
            Map.Entry<String, LockInfo> entry = iterator.next();
            LockInfo lock = entry.getValue();

            if (now.isAfter(lock.expiresAt)) {
                Event event = eventRepository.findById(lock.eventId).orElse(null);
                if (event != null) {
                    event.setAvailableTickets(event.getAvailableTickets() + lock.tickets);
                    eventRepository.save(event);
                }
                iterator.remove();
                System.out.println("Released expired lock: " + entry.getKey()
                        + " — returned " + lock.tickets + " tickets");
            }
        }
    }
}
