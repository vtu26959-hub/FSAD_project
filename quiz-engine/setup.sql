-- =============================================
-- Quiz Engine — Database Setup (v3 - Production)
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS guards.
-- Includes all performance indexes and ENGINE=InnoDB.
-- =============================================

CREATE DATABASE IF NOT EXISTS quiz_engine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quiz_engine;

-- -----------------------------------------------
-- users
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    email      VARCHAR(150)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    role       ENUM('user','admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------
-- quizzes
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    description TEXT,
    created_by  INT           NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_quiz_owner (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------
-- questions
-- quiz_id NULL = admin global question bank
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id       INT DEFAULT NULL,
    question      TEXT          NOT NULL,
    optionA       VARCHAR(255)  NOT NULL,
    optionB       VARCHAR(255)  NOT NULL,
    optionC       VARCHAR(255)  NOT NULL,
    optionD       VARCHAR(255)  NOT NULL,
    correctOption ENUM('A','B','C','D') NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    INDEX idx_question_quiz (quiz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------
-- quiz_attempts  (legacy — kept for admin dashboard)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT           NOT NULL,
    score           INT           NOT NULL,
    total_questions INT           NOT NULL,
    percentage      DECIMAL(5,2)  NOT NULL,
    certificate_id  VARCHAR(100)  DEFAULT NULL,
    date            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------
-- quiz_sessions
-- Each hosted instance of a quiz template.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id    INT          NOT NULL,
    host_id    INT          NOT NULL,
    join_code  VARCHAR(6)   NOT NULL UNIQUE,
    status     ENUM('active','completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at   TIMESTAMP   NULL,
    FOREIGN KEY (quiz_id)  REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (host_id)  REFERENCES users(id)   ON DELETE CASCADE,
    INDEX idx_qs_code   (join_code),
    INDEX idx_qs_quiz   (quiz_id),
    INDEX idx_qs_host   (host_id),
    INDEX idx_qs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------
-- session_participants
-- UNIQUE(session_id, user_id) prevents duplicate join at DB level.
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS session_participants (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    session_id      INT           NOT NULL,
    user_id         INT           NOT NULL,
    score           INT           DEFAULT NULL,
    total_questions INT           DEFAULT NULL,
    percentage      DECIMAL(5,2)  DEFAULT NULL,
    certificate_id  VARCHAR(100)  DEFAULT NULL,
    joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at    TIMESTAMP     NULL,
    UNIQUE KEY unique_participant (session_id, user_id),
    INDEX idx_sp_session (session_id),
    INDEX idx_sp_user    (user_id),
    INDEX idx_sp_score   (score),
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------
-- Seed: Admin account
-- Password: run fix-admin-password.js to set correct hash
-- -----------------------------------------------
INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@quizengine.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.ogRDM4RqBxOoSnKa', 'admin')
ON DUPLICATE KEY UPDATE name = name;

-- -----------------------------------------------
-- Seed: Global question bank (quiz_id = NULL)
-- -----------------------------------------------
INSERT INTO questions (quiz_id, question, optionA, optionB, optionC, optionD, correctOption) VALUES
(NULL,'Which language is used for client-side web scripting?','Java','Python','JavaScript','PHP','C'),
(NULL,'What does HTML stand for?','HyperText Markup Language','HighText Machine Language','HyperText and links Markup Language','None of these','A'),
(NULL,'CSS stands for?','Computer Style Sheets','Colorful Style Sheets','Cascading Style Sheets','Creative Style Sheets','C'),
(NULL,'Which HTML tag creates a hyperlink?','<a>','<link>','<href>','<url>','A'),
(NULL,'Correct syntax for a JavaScript function?','function myFunc()','def myFunc():','void myFunc()','func myFunc()','A'),
(NULL,'Which SQL command retrieves data?','GET','SELECT','FETCH','READ','B'),
(NULL,'Which HTTP method sends data to a server?','GET','PUT','POST','DELETE','C'),
(NULL,'What does API stand for?','Application Programming Interface','Advanced Program Interaction','Automated Protocol Integration','Application Protocol Interface','A'),
(NULL,'Which is a NoSQL database?','MySQL','PostgreSQL','MongoDB','SQLite','C'),
(NULL,'What is Node.js?','A browser','A JavaScript runtime built on Chrome V8','A database','A CSS framework','B');
