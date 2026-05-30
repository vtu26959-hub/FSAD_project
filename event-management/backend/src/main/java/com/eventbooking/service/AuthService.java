package com.eventbooking.service;

import com.eventbooking.model.User;
import com.eventbooking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    public User register(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        
        // Ensure role is either ADMIN or USER. Default to USER if invalid.
        if (user.getRole() == null || (!user.getRole().equals("ADMIN") && !user.getRole().equals("USER"))) {
            user.setRole("USER");
        }
        
        return userRepository.save(user);
    }

    public User login(String email, String password) {
        Optional<User> optUser = userRepository.findByEmail(email);
        if (optUser.isPresent()) {
            User user = optUser.get();
            // Simple plain-text password check (for simplicity as requested)
            if (user.getPassword().equals(password)) {
                return user;
            } else {
                throw new RuntimeException("Invalid password");
            }
        } else {
            throw new RuntimeException("User not found");
        }
    }
}
