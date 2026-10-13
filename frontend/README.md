
# PharmaCore — Pharmacy Management System

**A Full-Stack Web Application for Pharmacy Operations**

**Presented by:** Nyarko Kelly

PharmaCore is a pharmacy management application designed to help pharmacies organize medicine records, inventory, suppliers, purchases, sales, prescriptions, and other essential operations through a centralized platform.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Project Objectives](#project-objectives)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Example Use Case](#example-use-case)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Project Overview

PharmaCore is a full-stack Pharmacy Management System developed to demonstrate how modern web technologies can support pharmacy operations.

The application is designed to provide a central place for managing medicines, monitoring inventory, recording purchases and sales, maintaining supplier and customer records, and handling prescription-related information.

The system uses React for the frontend, Node.js and Express.js for the backend, Sequelize as the Object-Relational Mapping (ORM) tool, and MySQL for data storage.

## Problem Statement

Pharmacies need reliable records of their medicines, suppliers, purchases, sales, stock quantities, and expiry dates.

When these activities are managed manually or through disconnected systems, staff may find it difficult to maintain accurate stock records, identify low-stock medicines, monitor expiry dates, and review sales activity.

PharmaCore aims to address these challenges by bringing important pharmacy management activities into one application.

## Project Objectives

- Centralize medicine and category management.
- Organize supplier and purchase records.
- Track medicine batches, quantities, and expiry dates.
- Record sales and associated sale items.
- Maintain customer and prescription records.
- Provide dashboard summaries and analytics.
- Implement authentication and role-based access controls.
- Maintain audit records for supported operations.

## Features

### 1. Medicine Management
- Manage medicine records.
- Organize medicines by category.
- Store medicine identifiers and relevant stock information.

### 2. Inventory Management
- Track medicine batches and quantities.
- Identify low-stock medicines.
- Monitor expired and soon-to-expire stock.
- Support inventory adjustments where implemented.

### 3. Supplier Management
- Maintain supplier information.
- Associate suppliers with purchase records.
- Improve access to supplier details.

### 4. Purchase Management
- Record purchases and purchase items.
- Track purchase status.
- Support receiving purchased stock.

### 5. Sales Management
- Record sales and sale items.
- Store quantities and selling prices.
- Maintain transaction records.

### 6. Customer Management
- Maintain customer records.
- Associate customer information with relevant transactions where supported.

### 7. Prescription Management
- Maintain prescription-related records.
- Organize prescription items.
- Support prescription workflows where implemented.

### 8. Dashboard and Analytics
- Display operational summaries.
- Present inventory and sales information.
- Support review of pharmacy activity.

### 9. Authentication and Audit Logging
- JWT-based authentication.
- Password hashing with bcrypt.
- Role-based access controls where configured.
- Audit logging for supported operations.

> Feature availability depends on the current implementation. Each workflow should be tested before the system is used in a real pharmacy.

---

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- React Router
- Lucide React

### Backend
- Node.js
- Express.js
- Sequelize ORM
- MySQL
- JSON Web Tokens (JWT)
- bcryptjs
- dotenv
- CORS

### Development Tools
- Visual Studio Code
- Git and GitHub
- npm
- MySQL Server or XAMPP

---

## System Architecture

```text
             User
               |
               v
       React Frontend
          (Vite)
               |
               | HTTP / REST API
               v
       Express.js Backend
               |
               | Sequelize ORM
               v
         MySQL Database