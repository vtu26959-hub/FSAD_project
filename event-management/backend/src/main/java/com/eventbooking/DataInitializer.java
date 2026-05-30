package com.eventbooking;

import com.eventbooking.model.Event;
import com.eventbooking.model.User;
import com.eventbooking.repository.BookingRepository;
import com.eventbooking.repository.EventRepository;
import com.eventbooking.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    public DataInitializer(EventRepository eventRepository, UserRepository userRepository, BookingRepository bookingRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
    }

    @Override
    public void run(String... args) {
        seedUsers();
        seedEvents();
    }
    
    private void seedUsers() {
        if (userRepository.count() == 0) {
            User admin = new User("System Admin", "admin@events.com", "admin", "ADMIN");
            User normalUser = new User("John Doe", "user@events.com", "user", "USER");
            userRepository.saveAll(Arrays.asList(admin, normalUser));
            System.out.println("✅ Seeded default Admin and User accounts.");
        }
    }

    private void seedEvents() {
        System.out.println("Clearing old events to ensure clean state...");
        bookingRepository.deleteAll();
        eventRepository.deleteAll();

        List<Event> events = Arrays.asList(
                // IT
                createEvent("CodeStorm Hackathon", "IT", "Technical", "Main Hall", "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop", "A 24-hour coding marathon to build innovative solutions."),
                createEvent("Tech Trivia", "IT", "Non-Technical", "Seminar Hall 1", "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&h=300&fit=crop", "Fun trivia on tech history and pop culture."),
                createEvent("Cloud Native Workshop", "IT", "Workshops", "Lab 3", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=300&fit=crop", "Hands-on workshop on Kubernetes and Docker."),
                createEvent("Future of Web3", "IT", "Seminars", "Auditorium", "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=300&fit=crop", "Expert talk on decentralization and Web3."),

                // CSE
                createEvent("AlgoRush Contest", "CSE", "Technical", "Auditorium", "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop", "Test your algorithmic problem-solving speed and accuracy."),
                createEvent("Gaming Arena", "CSE", "Non-Technical", "Activity Center", "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop", "Multiplayer gaming tournament featuring top titles."),
                createEvent("React Masters", "CSE", "Workshops", "Lab 2", "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop", "Deep dive into React components and state management."),
                createEvent("Careers in Software", "CSE", "Seminars", "Main Hall", "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&h=300&fit=crop", "Guidance from FAANG engineers on landing your dream job."),

                // ECE
                createEvent("Circuit Debugging", "ECE", "Technical", "Electronics Lab", "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop", "Identify and resolve issues in complex hardware circuits."),
                createEvent("Radio Jockey Hunt", "ECE", "Non-Technical", "Open Stage", "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&h=300&fit=crop", "Showcase your voice acting and RJ skills."),
                createEvent("Embedded Systems Bootcamp", "ECE", "Workshops", "Embedded Lab", "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=400&h=300&fit=crop", "Hands-on session on programming Arduino and Raspberry Pi."),
                createEvent("5G & Beyond", "ECE", "Seminars", "Conference Room", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=300&fit=crop", "Exploring the evolution of wireless communication networks."),

                // Mechanical
                createEvent("Robo Race", "Mechanical", "Technical", "Ground", "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop", "Design and race your custom-built robots against others."),
                createEvent("Junkyard Wars", "Mechanical", "Non-Technical", "Workshop Area", "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop", "Build creative art out of mechanical scrap."),
                createEvent("3D Printing 101", "Mechanical", "Workshops", "Design Lab", "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&h=300&fit=crop", "Learn how to design and print complex 3D models."),
                createEvent("Automotive Trends", "Mechanical", "Seminars", "Seminar Hall 2", "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop", "Seminar on EV and autonomous vehicle advancements."),

                // Civil
                createEvent("Bridge Design Challenge", "Civil", "Technical", "Civil Block", "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop", "Design and test the load-bearing capacity of your bridge model."),
                createEvent("City Photography", "Civil", "Non-Technical", "Campus Wide", "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400&h=300&fit=crop", "Capture the best architectural shots around campus."),
                createEvent("AutoCAD Mastery", "Civil", "Workshops", "Drafting Lab", "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop", "Master 2D drafting and 3D modeling with AutoCAD."),
                createEvent("Smart City Planning", "Civil", "Seminars", "Auditorium", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop", "Present your innovative ideas for sustainable urban development."),

                // Electrical
                createEvent("Power Grid Simulation", "Electrical", "Technical", "Electrical Lab", "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop", "Simulate and optimize power distribution networks."),
                createEvent("Neon Art Fest", "Electrical", "Non-Technical", "Open Air Theatre", "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=400&h=300&fit=crop", "Create glowing art using LEDs and neon strips."),
                createEvent("Renewable Energy Lab", "Electrical", "Workshops", "Lab 4", "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=300&fit=crop", "Build your own mini solar and wind energy models."),
                createEvent("The Future of EV", "Electrical", "Seminars", "Conference Room", "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=300&fit=crop", "Expert discussion on electric vehicle charging infrastructure."),

                // AI & Data Science
                createEvent("ML Hackathon", "AI & Data Science", "Technical", "Data Lab", "https://images.unsplash.com/photo-1527474305487-b87b222841cc?w=400&h=300&fit=crop", "Build predictive models and solve data-driven challenges."),
                createEvent("Data Viz Storytelling", "AI & Data Science", "Non-Technical", "Seminar Hall", "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop", "Tell compelling stories using visual data representations."),
                createEvent("TensorFlow Workshop", "AI & Data Science", "Workshops", "Lab 5", "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=300&fit=crop", "Get hands-on experience building neural networks."),
                createEvent("AI Ethics", "AI & Data Science", "Seminars", "Main Auditorium", "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop", "Panel discussion on the ethical implications of AI."),

                // Cyber Security
                createEvent("Capture The Flag (CTF)", "Cyber Security", "Technical", "Cyber Lab", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop", "Test your hacking skills in this intensive CTF competition."),
                createEvent("Escape Room: Cyber Breach", "Cyber Security", "Non-Technical", "Activity Center", "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=400&h=300&fit=crop", "Find physical clues to stop a simulated cyber attack."),
                createEvent("Ethical Hacking 101", "Cyber Security", "Workshops", "Lab 6", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop", "Learn the basics of penetration testing and network defense."),
                createEvent("Zero Trust Architecture", "Cyber Security", "Seminars", "Seminar Hall 1", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop", "Seminar on the future of enterprise security protocols.")
        );

        eventRepository.saveAll(events);
        System.out.println("✅ Seeded " + events.size() + " events across 8 departments.");
    }

    private Event createEvent(String name, String department, String category, String venue, String imageUrl, String description) {
        Event event = new Event();
        event.setName(name);
        event.setDepartment(department);
        event.setCategory(category);
        event.setDateTime(LocalDateTime.now().plusDays((long) (Math.random() * 30) + 1));
        event.setVenue(venue);
        event.setTicketPrice(new BigDecimal(100 + (Math.random() * 400))); // Random price between 100 and 500
        int totalTickets = 50 + (int) (Math.random() * 150); // Random total tickets between 50 and 200
        event.setTotalTickets(totalTickets);
        event.setAvailableTickets(totalTickets); // Initially all available
        event.setImageUrl(imageUrl);
        event.setDescription(description);
        return event;
    }
}
