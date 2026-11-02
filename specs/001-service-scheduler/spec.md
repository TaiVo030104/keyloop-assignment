# Feature Specification: Unified Service Scheduler

**Feature Branch**: `001-service-scheduler`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Build a Service Appointment Scheduler for dealership service
advisors, replacing manual booking. A user selects a customer's vehicle, a service type, a
dealership and a desired start time. Before confirming, the system checks that a compatible
ServiceBay AND a qualified Technician are both free for the entire service duration. If
available, the user confirms and a persistent Appointment linking customer, vehicle, technician
and bay is created. If not, the system suggests the nearest alternative slots. Users can view and
cancel appointments for a dealership and day. Concurrent bookings of the same resource must not
result in double-booking."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Book a service appointment with a real-time availability check (Priority: P1)

A service advisor is on the phone with a customer. They find the customer, pick the vehicle to
be serviced, choose the service type and the dealership, and enter the time the customer wants.
As soon as the request is complete, the system tells the advisor whether a suitable service bay
and a qualified technician are both free for the whole duration of that service. If they are,
the advisor reviews a summary (customer, vehicle, service, dealership, start and end time,
assigned technician, assigned bay) and confirms. The appointment is saved and remains visible
after the application is closed and reopened.

**Why this priority**: This is the core value of the product: replacing manual booking with a
booking that is guaranteed to be resourceable. Without it there is no product.

**Independent Test**: Using seeded data, book a service for a free time slot and verify that a
confirmed appointment exists with the correct customer, vehicle, technician, bay and time window,
and that it is still present after reloading the application.

**Acceptance Scenarios**:

1. **Given** a dealership with a free compatible bay and a free qualified technician between
   10:00 and 11:30, **When** the advisor requests a 90-minute service starting at 10:00, **Then**
   the system reports the slot as available, shows the proposed technician and bay, and shows
   the end time 11:30.
2. **Given** the slot was reported available, **When** the advisor confirms, **Then** a confirmed
   appointment is recorded linking customer, vehicle, service type, dealership, technician, bay,
   start and end time, and the advisor sees a confirmation with an appointment reference.
3. **Given** a confirmed appointment exists, **When** the application is reloaded, **Then** the
   appointment is still listed with the same details.
4. **Given** the advisor has not selected a vehicle, service type, dealership or start time,
   **When** they try to proceed, **Then** the system explains what is missing and does not check
   availability.

---

### User Story 2 - Get alternative slots when the requested time is unavailable (Priority: P2)

When no compatible bay or no qualified technician is free for the entire requested window, the
system says why (no bay, no technician, or outside opening hours) and offers the nearest
alternative start times on the same or following days that would work. The advisor can pick
one with a single action and continue to confirmation.

**Why this priority**: Customers rarely accept "no"; offering the next workable times keeps the
call short and the booking won.

**Independent Test**: With seeded data where all qualified technicians are busy at the requested
time, request a booking and verify that the system reports it as unavailable with a reason and
offers alternative slots, each of which can be booked successfully.

**Acceptance Scenarios**:

1. **Given** the only qualified technician is booked 10:00–11:00, **When** the advisor requests a
   60-minute service at 10:30, **Then** the system reports the slot unavailable because no
   qualified technician is free, and suggests alternatives such as 11:00.
2. **Given** a requested window that ends after closing time, **When** the advisor checks
   availability, **Then** the system reports that the service cannot finish within opening hours
   and suggests the earliest valid alternatives.
3. **Given** a list of suggested slots, **When** the advisor selects one, **Then** the request is
   updated to that time and shown as available, ready to confirm.

---

### User Story 3 - Booking stays safe when two advisors compete for the same resources (Priority: P2)

Two advisors may check the same slot at nearly the same time. Only one of them can obtain the
last free technician or bay. The other advisor is told, at the moment they confirm, that the slot
was just taken, and is offered fresh alternatives without losing what they entered. Pressing
confirm twice, or retrying after a network error, never creates two appointments.

**Why this priority**: Double-booking a bay or technician is the most costly failure of a
scheduler; it erodes trust immediately.

**Independent Test**: Open two sessions, check the same last-available slot in both, confirm in
the first, then confirm in the second, and verify the second is rejected with alternatives and
that only one appointment exists.

**Acceptance Scenarios**:

1. **Given** two advisors both saw a slot as available, **When** the first confirms and then the
   second confirms, **Then** the second is told the slot is no longer available, sees new
   alternatives, and keeps the selections they entered.
2. **Given** the advisor clicks confirm twice quickly or retries after a failed response,
   **When** the requests are processed, **Then** exactly one appointment exists.

---

### User Story 4 - View and cancel a dealership's appointments (Priority: P3)

An advisor opens the schedule for a dealership and a day and sees all appointments in time
order with customer, vehicle, service, technician, bay and status. They can cancel an
appointment (with a confirmation step); cancelled appointments stay visible as cancelled and
their technician and bay become available again for that time.

**Why this priority**: Supports daily operations and makes the effect of bookings visible, but
the core booking value is delivered without it.

**Independent Test**: With seeded appointments, open a dealership's day view, cancel one
appointment, and verify it shows as cancelled and that its former slot can now be booked.

**Acceptance Scenarios**:

1. **Given** three appointments on a day at a dealership, **When** the advisor opens that day,
   **Then** all three are listed in start-time order with their details and status.
2. **Given** a confirmed appointment, **When** the advisor cancels it and confirms the action,
   **Then** its status becomes cancelled and a new booking for the same technician, bay and time
   is accepted.

---

### Edge Cases

- A new booking starting exactly when another ends (back-to-back) is allowed; any overlap of even
  one minute is not.
- A service that would start before opening time or end after closing time is rejected with the
  reason "outside opening hours".
- A requested start time in the past is rejected.
- A technician who is free but lacks the required skill is never assigned.
- A bay that is free but of the wrong type for the service is never assigned.
- An inactive bay or a technician not working that day is never assigned.
- Cancelled appointments never block availability.
- When several technicians/bays qualify, assignment is deterministic and balances workload (the
  least-booked resource for that day is chosen).
- If no alternative slot exists within the search horizon, the system says so explicitly instead
  of showing an empty list.
- If the system is unreachable or returns an error, the advisor sees a clear message and can
  retry without re-entering data.
- Times are shown in the dealership's local time zone, even if the advisor's device is set to a
  different time zone.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to search existing customers by name, phone or email and select
  one of the customer's registered vehicles.
- **FR-002**: Users MUST be able to choose a dealership and one of the service types offered at
  that dealership; each service type shows its expected duration.
- **FR-003**: Users MUST be able to choose a desired start date and time, in the dealership's
  local time, in 15-minute increments.
- **FR-004**: The system MUST compute the service window as start time plus the service type's
  duration.
- **FR-005**: The system MUST check availability before confirmation and report "available" only
  if at least one active service bay of the required type AND at least one technician holding the
  required skill and working at that time are both free for the entire window.
- **FR-006**: Two time windows MUST be treated as conflicting if and only if one starts before the
  other ends and ends after the other starts (touching windows do not conflict).
- **FR-007**: When unavailable, the system MUST state the reason (no compatible bay, no qualified
  technician, outside opening hours, or start time in the past).
- **FR-008**: When unavailable, the system MUST suggest up to 5 nearest valid alternative start
  times within the next 7 days at the same dealership for the same service type.
- **FR-009**: When available, the system MUST show the proposed technician and bay before the
  user confirms.
- **FR-010**: When several resources qualify, the system MUST choose the technician and the bay
  with the fewest confirmed appointments that day, breaking ties by name.
- **FR-011**: On confirmation, the system MUST re-validate availability and either create a
  confirmed appointment or reject the request as a conflict with fresh alternative slots.
- **FR-012**: A confirmed appointment MUST record customer, vehicle, dealership, service type,
  technician, bay, start, end, status and creation time, and receive a unique reference.
- **FR-013**: Appointments MUST persist across application reloads and restarts.
- **FR-014**: Submitting the same booking request more than once (double-click, retry) MUST
  result in at most one appointment.
- **FR-015**: Users MUST be able to list appointments for a dealership and a date, ordered by
  start time, showing status.
- **FR-016**: Users MUST be able to cancel a confirmed appointment after an explicit
  confirmation; cancelled appointments MUST no longer block availability.
- **FR-017**: The system MUST display all times in the dealership's time zone.
- **FR-018**: The system MUST show loading, empty and error states for every data view, and
  allow retry after an error without losing entered data.
- **FR-019**: The system MUST record operational events (availability checks, confirmations,
  conflicts, cancellations, errors) with a correlation identifier for troubleshooting.
- **FR-020**: All booking functions MUST be operable by keyboard alone and announce
  availability results to assistive technology.

### Key Entities *(include if feature involves data)*

- **Dealership**: A service location; has a name, time zone and daily opening hours; owns service
  bays and employs technicians.
- **Service Type**: A kind of service (e.g., oil change, EV battery check); has a duration, the
  technician skill it requires and the bay type it requires.
- **Service Bay**: A physical workspace at one dealership; has a bay type (e.g., general, EV,
  alignment) and an active flag.
- **Technician**: A mechanic at one dealership; has a set of skills and working hours.
- **Customer**: A person who owns vehicles; has name and contact details.
- **Vehicle**: Belongs to a customer; identified by VIN, with make, model and year.
- **Appointment**: The confirmed booking; links customer, vehicle, dealership, service type,
  technician and bay for a start–end window; has a status (confirmed or cancelled), a unique
  reference and a creation time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An advisor can complete a booking for an available slot in under 90 seconds from
  selecting the customer.
- **SC-002**: The availability result appears within 1 second of the request being complete in
  95% of checks under normal conditions.
- **SC-003**: Zero double-bookings of a technician or bay occur across all automated conflict
  and concurrency test scenarios.
- **SC-004**: 100% of confirmed appointments remain retrievable with identical details after
  reloading the application.
- **SC-005**: When a requested slot is unavailable, at least one bookable alternative is offered
  in 100% of cases where one exists within the next 7 days.
- **SC-006**: All booking and cancellation flows can be completed using only a keyboard.

## Assumptions

- Users are dealership service advisors; authentication and role management are out of scope
  for this version.
- Customers and vehicles already exist in the system (seeded); creating or editing customers,
  vehicles, technicians, bays, dealerships or service types is out of scope.
- One appointment covers exactly one service type, one technician and one bay for the whole
  window; services are not split across technicians, bays or days.
- Opening hours and technician working hours are the same fixed daily schedule per dealership;
  holidays, breaks and overtime are out of scope.
- Rescheduling is done by cancelling and rebooking; in-place rescheduling is out of scope.
- "Real-time" means availability is evaluated against the latest stored bookings at check time
  and re-evaluated at confirmation; live push updates to other open screens are out of scope.
- Only the user-facing application is built in this version; the backend is simulated while
  honouring a published API contract, and data persistence is local to the user's browser.
- Customer notifications (SMS/email) are out of scope.
