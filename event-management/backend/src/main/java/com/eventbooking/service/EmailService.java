package com.eventbooking.service;

import com.eventbooking.model.Booking;
import com.eventbooking.model.Event;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Base64;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Async
    public void sendBookingConfirmation(Booking booking, Event event, String qrCodeBase64) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(booking.getEmail());
            helper.setSubject("EventSphere - Booking Confirmation: " + event.getName());
            helper.setFrom("no-reply@eventsphere.com");

            String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #0b0b0b; color: #ffffff; padding: 20px; text-align: center;'>" +
                    "<h2 style='color: #f97316;'>EventSphere Booking Confirmation</h2>" +
                    "<p style='color: #a1a1aa;'>Hi " + booking.getName() + ", your tickets have been successfully booked!</p>" +
                    "<div style='background-color: #1c1c1c; border: 1px solid #3f3f46; border-radius: 12px; padding: 20px; max-width: 500px; margin: 0 auto;'>" +
                    "   <h3 style='color: #ffffff;'>" + event.getName() + "</h3>" +
                    "   <p style='color: #a1a1aa;'><strong>Booking ID:</strong> " + booking.getBookingId() + "</p>" +
                    "   <p style='color: #a1a1aa;'><strong>Date:</strong> " + event.getDateTime().toString() + "</p>" +
                    "   <p style='color: #a1a1aa;'><strong>Venue:</strong> " + event.getVenue() + "</p>" +
                    "   <p style='color: #a1a1aa;'><strong>Tickets:</strong> " + booking.getTicketsBooked() + "</p>" +
                    "   <div style='margin-top: 20px;'>" +
                    "       <img src='cid:qrcode' alt='QR Code' style='border: 4px solid #f97316; border-radius: 8px;' width='200' height='200' />" +
                    "   </div>" +
                    "   <p style='color: #facc15; font-size: 12px; margin-top: 10px;'>Scan for Ticket Verification</p>" +
                    "</div>" +
                    "<p style='color: #a1a1aa; font-size: 12px; margin-top: 20px;'>Thank you for choosing EventSphere.</p>" +
                    "</body></html>";

            helper.setText(htmlContent, true);

            // Decode base64 QR code and embed as inline image
            if (qrCodeBase64 != null && !qrCodeBase64.isEmpty()) {
                byte[] qrCodeBytes = Base64.getDecoder().decode(qrCodeBase64);
                helper.addInline("qrcode", new ByteArrayResource(qrCodeBytes), "image/png");
            }

            mailSender.send(message);
            System.out.println("Confirmation email sent successfully to " + booking.getEmail());
        } catch (MessagingException e) {
            System.err.println("Failed to send confirmation email: " + e.getMessage());
            // We catch the error so that the booking process doesn't completely fail
        } catch (Exception e) {
            System.err.println("Error while preparing email: " + e.getMessage());
        }
    }
}
