# AR Home Companions

*Working title. Idea captured 2026-09-09. A first Android prototype is built and
lives in `companions/`, published at `/companions/`.*

A mobile AR app. You walk through your own flat or house and place cartoon
animals at fixed places. From then on the animals live there: you see them
through the phone (or smart glasses) whenever you look at that spot, and what
they do depends on the time of day.

The animals are not decoration. Each one carries an emotional or educational
job.

---

## The animals

### Dog — behind the front door
Purpose: **feeling welcome, feeling at home.**

- **Morning** — sleepy dog. Happy signals, but already missing you as you leave.
- **Afternoon** — fully awake, welcomes you home.
- **Evening / night** — sleepy again, howls, falls asleep.

Trigger is the door itself: opening or closing it wakes the scene.

### Parrot pair — on top of a piece of furniture
Purpose: **togetherness, teamwork, daily rhythm** (self-care, eating, resting).

- **Morning** — waking up slowly.
- **Afternoon** — eating nuts; shells accumulate on the floor below.
- **Evening** — preening each other, feather care.

### Frog — on the floor
Purpose: **remembering and learning to clean.**

The frog leaves mud or dirt on the floor. The dirt only disappears when the
user cleans that spot **physically, with a real cleaning tool**. The frog keeps
hopping around the flat, leaving new spots, until the whole flat has actually
been cleaned in reality.

### Monkey — in the bathroom
Purpose: **self-care routines.**

Brushes its teeth for a full three minutes, showers, picks up clothes.
Interactive: tapping the animal, or picking up the real toothbrush / stepping
into the shower / touching the laundry, starts the matching monkey action.

---

## Goal

Make routines feel like company instead of chores. The animals are the reason
to come home, to eat, to clean, to brush — especially for children, who should
build daily routines by keeping the animals' world in order.

---

## Platforms

- **Apple (LiDAR devices)** — LiDAR gives depth and room geometry, so animals
  can be placed precisely and stay put. RoomPlan / ARKit scene reconstruction
  can even label walls, floors and furniture.
- **Non-LiDAR phones** — must work too. Fallback: the user places each animal
  once by hand; the app remembers the anchor.
- **Smart glasses** — the real target form factor. Hands stay free, so the
  toothbrush/shower interactions actually work.

### Open question: automatic room/site detection via SfM?

Partly. Structure-from-motion plus plane detection can reliably find *floors,
walls and horizontal surfaces* on any ARCore/ARKit phone — enough to know
"this is a flat surface at 90 cm height, a plausible parrot perch". What SfM
alone does **not** give you is semantics: it will not tell you "this is the
bathroom" or "this is the front door". Options:

1. Ask the user once per room ("point at the door", "point at the sink") —
   simple, honest, no ML.
2. On-device object detection for a few landmark objects (door, sink, toilet,
   toothbrush cup) to suggest placements, user confirms.
3. iOS RoomPlan on LiDAR devices for automatic layout, manual on the rest.

**Biggest technical risk: anchor persistence without a cloud.** ARKit can save
a world map locally. On Android, the officially supported persistence path is
Google-hosted Cloud Anchors — which directly contradicts the privacy goal
below. Needs research: local feature-map persistence on Android, or a
self-hosted anchor store.

---

## Data acquisition

Measure length and regularity of the routines — brushing teeth, cleaning the
flat, tidying up — to show the user where their behaviour could be optimised.

### Privacy (hard requirement)

Nothing leaves the flat. No camera frames, no faces, no room geometry, no
behaviour logs to Google, Apple or anyone else. All processing and all storage
on device.

Consequences to design around:
- No cloud anchors (see above).
- No cloud analytics, no crash reporting that ships context.
- Backup/sync between the user's own devices only, end-to-end encrypted, or
  not at all.
- Verifying *real* cleaning without sending images off-device means the
  floor-diff / motion check has to run locally too.

---

## Educational purpose

Help children establish daily routines: brushing teeth long enough, tidying,
cleaning, regular meals — by making the routine the animals' story rather than
an instruction.

---

## Open questions / risks

- **Verifying physical cleaning.** How does the app know the floor was really
  wiped? Candidate signals: on-device camera diff of the spot, device motion
  pattern while the phone is pocketed, dwell time, a BLE tag on the mop. All
  are spoofable by a motivated child — is that acceptable, or is spoofability
  itself a design problem?
- **Holding the phone while cleaning or brushing** is awkward. Either the
  interactions are short check-ins (before/after), or this really wants glasses.
- **Children + camera + behaviour data** is a GDPR-sensitive combination even
  when everything stays local. Brushing-duration data is health-adjacent.
  Needs an explicit, written data model before any code.
- **Optimisation framing.** "Where you might optimise your behaviour" can tip
  into nagging or self-surveillance, especially for kids. The animals' framing
  (they are happy / they miss you) is probably the healthier channel than a
  statistics screen.
- **Scope.** Four animals with three day-phases each and interactions is a lot
  of animation. A first version could be the dog alone — it is the one with the
  clearest payoff and the simplest anchor (one door, one trigger).

---

## What the first prototype does (`companions/`)

Built as a WebXR PWA so it installs from a URL and needs no store, no account
and no backend. Android Chrome with the Google Play Services for AR; a camera +
gyro preview for phones without ARCore.

- All four animals, each with the three time-of-day behaviours described above.
- Manual placement: pick an animal, tap the spot. Hit-test where ARCore offers
  it, otherwise 1.4 m in front of the phone.
- Layout persistence without a cloud: positions are stored in a compass-aligned
  home frame, so re-opening from the same starting spot puts everyone back.
  Drift is corrected per animal with "Verschieben".
- Frog leaves mud, parrots drop nut shells. A spot only clears when the phone
  actually hovers over it *and keeps moving* for four seconds - the proxy for a
  hand wiping the floor. Standing still over it does nothing.
- Monkey runs the routines: 3 min brushing, shower, tidying. The timer pauses if
  you walk away from him.
- Routine log with a 7-day view, plus export and a wipe button. localStorage
  only; no network call after load.

### Still open in the prototype

- Cleaning verification is a movement proxy, not proof. A child who waves the
  phone around beats it.
- The starting-spot trick is the honest workaround for Android's lack of local
  anchor persistence, not a fix. Layouts drift over days.
- No sound. The dog's howl and the parrots' chatter are half the point.
- Nothing yet reads the door itself; the dog reacts to your distance, not to the
  door opening.
