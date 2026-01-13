# Crudo

A modern React application built with Vite, TypeScript, and Supabase, designed to demonstrate professional frontend architecture patterns and best practices. The application provides a comprehensive authentication system with Supabase integration, showcasing efficient state management, API communication, and user interface design.

The core purpose is to serve as a foundation for building scalable React applications with proper separation of concerns, type safety, and maintainable code structure. The system offers real-time state synchronization, secure authentication with Supabase, and responsive design to support both desktop and mobile usage.

Target users include developers building React applications who require a robust foundation with authentication, state management, and modern UI components. The application demonstrates professional patterns for API integration, form handling, and user experience optimization.

## Tech Stack

The application is built on **Vite 6** with React 19, which provides lightning-fast development experience with Hot Module Replacement (HMR) and optimized production builds. TypeScript provides strict type safety throughout the codebase, eliminating runtime type errors and improving developer experience.

**Authentication and backend** is handled by **Supabase**, which provides a complete backend-as-a-service solution including authentication, database, and real-time capabilities. Supabase handles user authentication, session management, and token refresh automatically.

**State management** is handled by **React Context API**, providing a simple and lightweight solution for global state without the complexity of Redux. The `AuthContext` manages authentication state and provides a `useAuth` hook for accessing user data throughout the application.

**Routing** is implemented using **React Router v7** with a declarative route configuration. Protected and public routes are handled through route wrapper components that manage authentication state and redirects.

**Styling** is implemented using **Tailwind CSS** with a custom theme system that centralizes all color values, spacing, and typography through CSS variables. The **shadcn/ui** component library provides accessible, customizable UI primitives that follow modern design patterns. Components are built with Radix UI primitives for accessibility and composability.

**Form management** leverages **react-hook-form** for performant form state handling with minimal re-renders. **Yup** provides schema validation integrated with react-hook-form through `@hookform/resolvers`.

**Notifications** are handled by **react-hot-toast** for elegant, non-intrusive user feedback with customizable styling that matches the design system.

**Code quality** is enforced through ESLint with TypeScript ESLint plugin and React-specific rules. TypeScript strict mode ensures compile-time type safety.

## Prerequisites

**Node.js** version 18.x or higher is required to run this project. The application uses npm as the package manager for dependency management. All environment variables must be configured before running the application, including Supabase project credentials.

## Project Setup

Clone the repository to your local machine using Git. Navigate to the project directory in your terminal. Install all project dependencies by running the `npm install` command, which will download and set up all required packages defined in `package.json`.

Configure environment variables by creating a `.env` file in the project root. The file must contain:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

These values can be found in your Supabase project settings under API. The anonymous key is safe to use in client-side code.

Start the development server using `npm run dev`, which launches the Vite development server with hot module replacement. The application will be available at `http://localhost:5173` (or the next available port). Changes to source files will automatically trigger browser refresh.

For production deployment, build the application using `npm run build`, which creates an optimized production build in the `dist` directory. Preview the production build locally using `npm run preview` to test the optimized version before deployment.

## Folder Structure

The project follows a modular architecture with clear separation of concerns. All source code resides in the `src` directory to maintain a clean project root.

The **`src/pages`** directory contains page-level components organized by feature. The `auth` subdirectory contains authentication pages like Login and Register. Other pages like Home and SupabaseTest demonstrate different application features.

The **`src/services`** directory contains service layer functions that handle all external API interactions and business logic. The `authServices.ts` file contains all Supabase authentication operations including sign in, sign up, sign out, session management, and token refresh. This separation keeps business logic separate from UI components.

The **`src/contexts`** directory contains React Context providers for global state management. The `AuthContext.tsx` file provides authentication state through a Context provider and `useAuth` hook, making user data accessible throughout the application.

The **`src/components`** directory houses reusable UI components. The `ui` subdirectory contains base shadcn/ui components like Button, Input, Card, Alert, Form, and Label that serve as building blocks. The root level contains application-specific components like AuthInit.

The **`src/lib`** directory contains utility functions, configurations, and shared logic. The `supabase` subdirectory contains the Supabase client configuration. The `utils` subdirectory contains helper functions like cookie management and authorization utilities. The `config` subdirectory contains environment configuration.

The **`src/types`** directory contains TypeScript type definitions organized by domain. The `auth.types.ts` file defines authentication-related types like User, AuthState, LoginCredentials, and AuthResponse. The `api.types.ts` file defines API-related types. The `index.ts` file serves as a central export for all types.

The **`src/router`** directory contains React Router configuration. The `index.tsx` file defines all application routes with protected and public route wrappers. The `ProtectedRoute` component ensures only authenticated users can access protected pages, while `PublicRoute` redirects authenticated users away from public pages.

The **`src/hooks`** directory contains custom React hooks like `useAuthInit` for authentication initialization logic.

The **`src/assets`** directory contains static assets including images and other media files used throughout the application.

## Environment Configuration

Environment variables are managed through a `.env` file in the project root. Vite requires environment variables to be prefixed with `VITE_` to be accessible in the browser. Variables without this prefix are only available in Node.js during build time.

The `VITE_SUPABASE_URL` variable provides your Supabase project URL, which is used to initialize the Supabase client. This URL is safe to expose in client-side code.

The `VITE_SUPABASE_ANON_KEY` variable provides your Supabase anonymous/public key, which is used for client-side authentication and API requests. This key has restricted permissions and is safe to use in client-side code.

Local development allows quick iteration with hot reloading and detailed error messages. Production builds use optimized code with minimal source maps and production API endpoints.

## API Architecture

API communication follows a service-based architecture using **Supabase**, which provides a complete backend solution including authentication, database, and real-time capabilities. All API interactions are centralized in the `src/services` directory.

The **`authServices.ts`** file contains all authentication-related operations:
- `signIn` - Authenticate user with email and password
- `signUp` - Register new user with email and password
- `signOut` - Sign out the current user
- `getSession` - Get the current session
- `getCurrentUser` - Get the current authenticated user
- `refreshSession` - Refresh the current session token
- `onAuthStateChange` - Listen to authentication state changes

**Error handling** follows a standardized approach where all service functions throw errors that can be caught and handled by components. Errors from Supabase are automatically typed and provide detailed error messages.

**Authentication handling** is integrated at the service level. Supabase automatically handles token management, storage, and refresh. The `AuthContext` listens to authentication state changes and updates the application state accordingly.

**Request and response normalization** occurs in the service layer, where Supabase responses are transformed into application-specific types. This keeps the UI layer clean and focused on presentation.

## State Management (React Context)

React Context API is used to provide predictable state management with minimal boilerplate. The `AuthContext` provides authentication state including user data and authentication status through a simple `useAuth` hook.

**State structure** follows a simple pattern where the `AuthProvider` component manages authentication state and provides it through Context. The `useAuth` hook provides access to:
- `user` - Current user object or null
- `isLoading` - Loading state during initialization
- `isAuthenticated` - Boolean indicating authentication status
- `setUser` - Function to update user state

**Best practices** include using the `useAuth` hook for all authentication-related state access, keeping UI state local to components when possible, and using Context only for truly global state like authentication.

**State persistence** is handled automatically by Supabase, which stores sessions in localStorage. The `AuthContext` initializes by checking for an existing session on mount and listens to authentication state changes to keep the UI in sync.

## TypeScript Setup

**Strict type safety** is enforced throughout the codebase with TypeScript's strict mode enabled. This configuration prevents common type-related errors and ensures compile-time safety. The philosophy emphasizes catching errors during development rather than runtime.

**Interfaces and types** are used strategically with interfaces preferred for object shapes that may be extended, and types used for unions, intersections, and computed types. All component props are typed, all function parameters and return values are typed, and all API request and response structures are typed.

The **avoidance of `any` types** is strictly enforced. When type information is unavailable, `unknown` is used instead of `any`, requiring proper type guards before usage. This approach maintains type safety while handling dynamic data.

**Shared types strategy** organizes types by domain in the `src/types` directory. Common types like API error responses are defined in `api.types.ts`, while feature-specific types like authentication types are defined in `auth.types.ts`. The `index.ts` file provides a central export point for all types, improving discoverability and maintaining clear boundaries between features.

## Modular Architecture

The service-based folder structure enables scalable organization where business logic is separated from UI components. The `src/services` directory contains all external API interactions, while components focus solely on presentation and user interaction.

**Reusability strategy** prioritizes shared components in `src/components/ui` for cross-feature UI elements, form components integrated with react-hook-form, and service functions in `src/services` for reusable business logic.

**Shared components and utilities** are organized in `src/components` for UI components, `src/lib` for utility functions and configurations, and `src/types` for shared type definitions. This centralization prevents duplication and ensures consistency.

**Scalability considerations** include the service layer supporting team collaboration by allowing different developers to work on different services without conflicts, the clear separation of concerns making it easier to test and maintain individual features, and the consistent patterns enabling quick onboarding of new team members.

## Routing Architecture

Routing is handled by **React Router v7** with a declarative configuration in `src/router/index.tsx`. Routes are defined using `createBrowserRouter` with protected and public route wrappers.

**Protected routes** are wrapped with the `ProtectedRoute` component, which uses the `useAuth` hook to check authentication state and redirects to login if the user is not authenticated. This ensures only authenticated users can access protected pages.

**Public routes** are wrapped with the `PublicRoute` component, which redirects authenticated users away from public pages like login and register to prevent unnecessary navigation.

**Role-based routes** are handled by the `RoleBasedRoute` component, which checks both authentication status and user roles before allowing access to specific routes.

Route configuration is centralized in a single file, making it easy to understand the application's navigation structure and add new routes as needed.

## UI Component System

The application uses **shadcn/ui** components built on Radix UI primitives, providing accessible, customizable UI components. All components are located in `src/components/ui` and follow a consistent pattern with variant-based styling using `class-variance-authority`.

**Button component** includes multiple variants (default, destructive, outline, secondary, ghost, link, success, warning, info, gradient, and soft variants) with different sizes (sm, default, lg, xl, icon variants). All variants include proper hover states, focus management, and disabled states.

**Form components** are integrated with react-hook-form through the Form component, providing type-safe form handling with automatic validation and error display.

**Styling** uses Tailwind CSS with CSS variables for theming, enabling easy theme customization and dark mode support. All colors are defined in `src/index.css` using CSS variables, ensuring consistent theming across the application.

## Linting and Code Quality

**ESLint configuration** follows React and TypeScript best practices with additional rules from the TypeScript ESLint plugin. Unused imports are automatically detected and can be removed. Import ordering ensures consistent import organization.

**Enforced standards** include strict TypeScript mode with no `any` types allowed, all colors must come from the theme system with no hardcoded values, components must be accessible by default with proper ARIA attributes, and minimal documentation with comments only for critical flow explanations.

**Code formatting** is handled through consistent use of ESLint rules. The project follows a clean code philosophy with self-documenting code that minimizes the need for comments.

## Performance & Best Practices

**Optimization techniques** include Vite's automatic code splitting, React's component memoization where appropriate, and image optimization through proper asset management. The Context API uses proper memoization to prevent unnecessary re-renders.

**Rendering strategies** prioritize functional components with hooks for state management. Client-side rendering is used throughout, with React Router handling navigation without full page reloads.

**Bundle and asset management** leverages Vite's automatic optimization for JavaScript bundles, CSS optimization through Tailwind's purging of unused styles, and proper asset handling. Assets are served with appropriate caching headers in production.

**Additional performance considerations** include lazy loading for heavy components when needed, memoization for expensive computations, and proper use of React.memo for components that receive stable props. Supabase's built-in caching and connection pooling reduce redundant API calls.

## Authentication Flow

The authentication system implements a complete flow with login, registration, token management, and automatic re-authentication using Supabase. User credentials are validated through Supabase Auth, and successful authentication automatically manages sessions.

**Token management** is handled automatically by Supabase, which stores sessions securely and handles token refresh. The `AuthContext` listens to authentication state changes and updates the application state accordingly.

**State persistence** ensures users remain logged in across browser sessions through Supabase's session storage. The authentication state is automatically restored on application load, providing seamless user experience.

**Route protection** is handled through `ProtectedRoute` and `PublicRoute` components that use the `useAuth` hook to check authentication state and redirect appropriately. This ensures proper access control throughout the application.

**Role-based access control** is implemented through the `RoleBasedRoute` component, which checks user roles before allowing access to specific routes. User roles are stored in Supabase user metadata and can be customized as needed.

## Git Workflow

**Branching strategy** should follow a hierarchy where `main` is the most stable branch for production deployments. Feature branches should branch off from `main` or a development branch, and pull requests should be raised for code review before merging.

**Pull request rules** should require all linting checks to pass before merging, code review approval from at least one team member, and resolution of all review comments. Pull requests must have descriptive titles and descriptions explaining changes.

**Code review expectations** should include checking for adherence to project standards, verifying TypeScript types are properly used, ensuring accessibility requirements are met, and confirming the application builds successfully. Reviewers should provide constructive feedback and approve when standards are met.

## Deployment

**Supported deployment environments** include development for local development with hot reloading, and production for live application with production API endpoints and optimized builds.

**Build considerations** include optimized production builds with minimal source maps, static asset optimization through Vite's build process, and proper environment variable configuration. Build outputs are validated before deployment.

**Environment variable handling** in production requires the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to be set in the deployment platform's environment configuration. These variables are safe to expose in client-side code as the anonymous key has restricted permissions. Environment variables are validated during build to ensure required values are present.

**Deployment steps** include running `npm run build` to create the production build, verifying the `dist` directory contains all necessary files, and deploying the `dist` directory to a static hosting service or web server. The application is a Single Page Application (SPA), so server configuration must route all requests to `index.html` for client-side routing to work.

## Contribution Guidelines

**New developers** should start by reading this README and understanding the project structure. Set up the development environment following the Project Setup section. Review existing code to understand patterns and conventions before making changes.

**Coding standards** require following the service-based architecture pattern, using TypeScript with strict mode, importing colors from the theme system, ensuring accessibility in all components, and maintaining minimal documentation. All code must pass ESLint checks.

**Commit message expectations** should follow conventional commit format with clear, descriptive messages. Commit messages should explain what changes were made and why. Related changes should be grouped in single commits, and commits should be atomic and focused on a single concern.

## Notes

**Known limitations** include the requirement for JavaScript to be enabled in browsers for full functionality, as the application is a client-side rendered React application. Supabase session storage requires localStorage to be available in the browser.

**Current implementation** uses Supabase for all backend services including authentication, database, and real-time capabilities. The service layer in `src/services` provides a clean abstraction over Supabase operations, making it easy to swap implementations if needed.

**Future improvements** may include additional performance optimizations through further code splitting, enhanced error tracking and monitoring, expanded test coverage with unit and integration tests, and additional accessibility features. The service-based architecture supports easy addition of new features and scaling of the application.
