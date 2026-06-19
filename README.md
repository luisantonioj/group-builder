# Group Builder App

This repository contains the source code for the Group Builder application. It is a full-stack web application designed to manage and organize candidates, groups, events, and rooms.

This project is personally built and dedicated for the Bukas Loob sa Diyos (BLD) Lipa Youth Ministry. It was created to help streamline the ministry's youth events, manage participant masterlists, and automate group and room assignments.

---

## Features

* **Authentication:** Includes secure login, registration, join workflows, and user onboarding.


* **Dashboard:** Provides a central interface for viewing organization data.


* **Event Management:** Allows users to set up and manage youth ministry events.


* **Group and Room Organization:** Features dedicated interfaces to auto-assign and manage candidates within specific groups and rooms.


* **Masterlist:** Maintains a complete masterlist of candidate records.


* **Reporting:** Supports report generation and data exporting.


* **Data Visualization:** Includes a visualizer page and custom UI components like donut charts.


* **Candidate Tools:** Supports importing participant data, tracking connections, and batch-deleting candidate records.



---

## Tech Stack

The application relies on the following core technologies:

* **Framework:** Next.js utilizing the App Router directory structure.


* **Language:** TypeScript for type-safe code.


* **Database ORM:** Prisma for database schema management and migrations.


* **Authentication:** NextAuth.js for handling secure access.


* **Styling:** Tailwind CSS and PostCSS for responsive design.


* **Client Data Management:** Dexie.js for local browser database handling.



---

## Project Structure

* **`app/`**: Contains the core Next.js routing, categorized into `(app)`, `(auth)`, `(onboarding)`, and `api` directories.


* **`components/`**: Houses reusable UI elements (e.g., modals, chips, search inputs) and application layout shells.


* **`lib/`**: Includes utility functions, authentication logic, database client setup, and conflict detection rules.


* **`prisma/`**: Contains the Prisma schema definition, database migration history, and seed scripts.


* **`public/`**: Stores static assets, icons, application manifests, and service workers for Progressive Web App capabilities.


* **`types/`**: Holds custom TypeScript type definitions and declarations.
