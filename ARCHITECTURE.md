# VALKYRIAS - Project Architecture

## Project Overview

VALKYRIAS is a professional editing marketplace for editors and clients.

## Technology Stack

### Frontend

-   React
-   Vite
-   TypeScript

### Backend

-   Java 21
-   Spring Boot 3
-   Spring Security
-   Maven

### Database

-   Supabase PostgreSQL

### Authentication

-   Spring Security + JWT

### Storage

-   Supabase Storage

## Architecture

React -\> Spring Boot REST API -\> Supabase PostgreSQL React -\> Spring
Boot REST API -\> Supabase Storage

## Rules

-   React communicates ONLY with Spring Boot.
-   Spring Boot is the ONLY backend.
-   Spring Boot contains all business logic.
-   Only Spring Boot accesses the database.

## User Roles

-   Admin
-   Editor
-   Client

## Core Modules

-   Authentication
-   User Management
-   Portfolio
-   Project Requirements
-   Editor Matching
-   Hiring
-   Orders
-   File Upload
-   File Delivery
-   Revisions
-   Payments
-   Notifications
-   Chat
-   Reviews
-   Admin Dashboard

## Non-Negotiable Rules

-   NEVER migrate to Node.js.
-   NEVER migrate to Express.
-   NEVER migrate to Next.js.
-   NEVER migrate to Firebase.
-   NEVER remove Spring Boot.
-   NEVER delete Java files.
-   NEVER delete pom.xml.
-   NEVER replace Maven.
-   NEVER replace Spring Security.
-   NEVER redesign the UI.
-   NEVER remove existing functionality.
-   NEVER rewrite the project.

## AI Instructions

Always read this file before making changes. Preserve the architecture.
Implement only the requested feature.
