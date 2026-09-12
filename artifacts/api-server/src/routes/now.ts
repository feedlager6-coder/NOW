import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";

type Meetup = {
  id: string;
  activityTypeId: string;
  activityTitle: string;
  activityIcon: string;
  zoneId: string;
  zoneName: string;
  publicPlaceName: string;
  distanceBand: string;
  safeDescription: string;
  capacity: number;
  occupiedSlots: number;
  startsAt: string;
  status: string;
  participantSilhouettes: string[];
  isUserJoined: boolean;
};

type Message = {
  id: string;
  meetupId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
};

const zones = [
  { id: "DEMO_ZONE_CENTER", name: "Центр", distance: "до 500 м" },
  { id: "DEMO_ZONE_PARK", name: "Парк", distance: "до 1 км" },
  { id: "DEMO_ZONE_RIVER", name: "Набережная", distance: "до 1 км" },
  { id: "DEMO_ZONE_SPORT", name: "Спортгородок", distance: "до 1.5 км" },
];

const activityMeta: Record<string, { title: string; icon: string }> = {
  walking: { title: "Прогулка", icon: "footprints" },
  walk: { title: "Прогулка", icon: "footprints" },
  coffee: { title: "Кофе", icon: "coffee" },
  football: { title: "Футбол", icon: "trophy" },
  sports_viewing: { title: "Смотрим матч", icon: "tv" },
  board_games: { title: "Настольные игры", icon: "dice-5" },
  study: { title: "Учёба", icon: "book-open" },
  workout: { title: "Воркаут", icon: "dumbbell" },
};

const silhouettes = Array.from(
  { length: 8 },
  (_, index) => `/avatars/silhouette-${index + 1}.svg`,
);

const makeMeetup = (
  activityTypeId: string,
  zoneIndex: number,
  occupiedSlots: number,
  capacity: number,
  minutes: number,
  place: string,
  description: string,
): Meetup => {
  const zone = zones[zoneIndex % zones.length];
  const meta = activityMeta[activityTypeId] ?? activityMeta.walking;
  return {
    id: `demo-${activityTypeId}-${zone.id.toLowerCase()}`,
    activityTypeId,
    activityTitle: meta.title,
    activityIcon: meta.icon,
    zoneId: zone.id,
    zoneName: zone.name,
    publicPlaceName: place,
    distanceBand: zone.distance,
    safeDescription: description,
    capacity,
    occupiedSlots,
    startsAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    status: "forming",
    participantSilhouettes: silhouettes.slice(0, Math.max(1, occupiedSlots)),
    isUserJoined: false,
  };
};

const meetups: Meetup[] = [
  makeMeetup("walking", 1, 3, 5, 12, "Главный вход в парк", "Спокойная прогулка по освещённой аллее."),
  makeMeetup("coffee", 0, 2, 4, 18, "Кофейня на площади", "Открытая терраса, встречаемся у стойки."),
  makeMeetup("board_games", 2, 4, 6, 25, "Лаунж у набережной", "Настолки и знакомство без громкой музыки."),
  makeMeetup("football", 3, 5, 8, 34, "Поле 2, спортгородок", "Играем короткими командами, новичкам рады."),
  makeMeetup("study", 0, 1, 3, 42, "Читальный зал", "Тихий совместный спринт на час."),
];

const messages: Message[] = [
  {
    id: "message-welcome",
    meetupId: meetups[0].id,
    userId: "demo-user-mila",
    displayName: "Мила",
    body: "Я уже у входа в парк.",
    createdAt: new Date(Date.now() - 7 * 60_000).toISOString(),
  },
];

const profile = {
  displayName: "Алекс",
  bio: "Люблю прогулки, кофе и короткие планы.",
  reliabilityScore: 96,
  avatarRef: "/avatars/silhouette-1.svg",
  ageBand: "22–25",
  interestIds: ["walking", "coffee", "board_games"],
};

const interests = [
  { id: "walking", label: "Прогулки" },
  { id: "coffee", label: "Кофе" },
  { id: "football", label: "Футбол" },
  { id: "board_games", label: "Настольные игры" },
  { id: "study", label: "Учёба" },
  { id: "workout", label: "Воркаут" },
];

let pendingPhone = "";
let ageConfirmed = true;

function serializeMeetup(meetup: Meetup, userId?: string) {
  return {
    ...meetup,
    isUserJoined: userId ? Boolean(meetup.isUserJoined) : meetup.isUserJoined,
  };
}

const router: IRouter = Router();

router.get("/meetups", (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const zoneId = typeof req.query.zoneId === "string" ? req.query.zoneId : undefined;
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const filtered = meetups.filter((meetup) => {
    const categoryMatch =
      !category ||
      meetup.activityTypeId === category ||
      (category === "sports" &&
        ["football", "sports_viewing", "workout"].includes(meetup.activityTypeId));
    return categoryMatch && (!zoneId || meetup.zoneId === zoneId);
  });
  res.json({
    success: true,
    mode: "DEMO_MODE",
    count: filtered.length,
    meetups: filtered.map((meetup) => serializeMeetup(meetup, userId)),
    timestamp: new Date().toISOString(),
  });
});

router.post("/meetups", (req, res) => {
  const {
    creatorId = "demo-user-alex",
    activityTypeId,
    zoneId,
    publicPlaceName,
    startsInMinutes = 15,
    capacity = 4,
    safeDescription = "",
  } = req.body ?? {};
  if (
    typeof activityTypeId !== "string" ||
    typeof zoneId !== "string" ||
    typeof publicPlaceName !== "string" ||
    publicPlaceName.trim().length < 2
  ) {
    res.status(422).json({ success: false, error: "VALIDATION_ERROR" });
    return;
  }
  const zoneIndex = Math.max(
    0,
    zones.findIndex((zone) => zone.id === zoneId),
  );
  const zone = zones[zoneIndex] ?? zones[0];
  const meta = activityMeta[activityTypeId] ?? activityMeta.walking;
  const created: Meetup = {
    id: `demo-${randomUUID()}`,
    activityTypeId,
    activityTitle: meta.title,
    activityIcon: meta.icon,
    zoneId: zone.id,
    zoneName: zone.name,
    publicPlaceName: publicPlaceName.trim(),
    distanceBand: zone.distance,
    safeDescription: typeof safeDescription === "string" ? safeDescription : "",
    capacity: Number(capacity) || 4,
    occupiedSlots: 1,
    startsAt: new Date(
      Date.now() + (Number(startsInMinutes) || 15) * 60_000,
    ).toISOString(),
    status: "forming",
    participantSilhouettes: silhouettes.slice(0, 1),
    isUserJoined: true,
  };
  meetups.unshift(created);
  res.status(201).json({
    success: true,
    mode: "DEMO_MODE",
    rawId: created.id,
    meetup: serializeMeetup(created, creatorId),
  });
});

router.get("/meetups/:id", (req, res) => {
  const meetup = meetups.find((candidate) => candidate.id === req.params.id);
  if (!meetup) {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
    return;
  }
  res.json({ success: true, meetup: serializeMeetup(meetup) });
});

router.post("/meetups/:id/join", (req, res) => {
  const meetup = meetups.find((candidate) => candidate.id === req.params.id);
  if (!meetup) {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
    return;
  }
  if (meetup.occupiedSlots < meetup.capacity) {
    meetup.occupiedSlots += 1;
    meetup.isUserJoined = true;
    meetup.participantSilhouettes = silhouettes.slice(
      0,
      Math.min(meetup.occupiedSlots, silhouettes.length),
    );
  }
  res.json({ success: true, meetup });
});

router.post("/meetups/:id/leave", (req, res) => {
  const meetup = meetups.find((candidate) => candidate.id === req.params.id);
  if (!meetup) {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
    return;
  }
  meetup.occupiedSlots = Math.max(1, meetup.occupiedSlots - 1);
  meetup.isUserJoined = false;
  meetup.participantSilhouettes = silhouettes.slice(
    0,
    Math.min(meetup.occupiedSlots, silhouettes.length),
  );
  res.json({ success: true, meetup });
});

router.post("/meetups/:id/check-in", (req, res) => {
  const meetup = meetups.find((candidate) => candidate.id === req.params.id);
  if (!meetup) {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
    return;
  }
  meetup.status = "live";
  res.json({ success: true, meetup });
});

router.post("/meetups/:id/complete", (req, res) => {
  const meetup = meetups.find((candidate) => candidate.id === req.params.id);
  if (!meetup) {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
    return;
  }
  meetup.status = "completed";
  res.json({ success: true, meetup });
});

router.get("/meetups/:id/messages", (req, res) => {
  res.json({
    success: true,
    messages: messages.filter((message) => message.meetupId === req.params.id),
  });
});

router.post("/meetups/:id/messages", (req, res) => {
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) {
    res.status(422).json({ success: false, error: "VALIDATION_ERROR" });
    return;
  }
  const message: Message = {
    id: randomUUID(),
    meetupId: req.params.id,
    userId: req.body?.userId || "demo-user-alex",
    displayName: "Алекс",
    body,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  res.status(201).json({ success: true, message });
});

router.get("/meetups/:id/share-card", (req, res) => {
  const meetup = meetups.find((candidate) => candidate.id === req.params.id);
  if (!meetup) {
    res.status(404).json({ success: false, error: "NOT_FOUND" });
    return;
  }
  res.json({
    success: true,
    card: {
      title: `${meetup.activityTitle} рядом`,
      place: meetup.publicPlaceName,
      distance: meetup.distanceBand,
      people: `${meetup.occupiedSlots}/${meetup.capacity}`,
      startsAt: meetup.startsAt,
    },
  });
});

router.get("/interests", (_req, res) => {
  res.json({ success: true, interests });
});

router.get("/profile", (_req, res) => {
  res.json({ success: true, profile, interests });
});

router.patch("/profile", (req, res) => {
  if (typeof req.body?.displayName === "string") {
    profile.displayName = req.body.displayName.trim().slice(0, 30) || profile.displayName;
  }
  if (typeof req.body?.bio === "string") {
    profile.bio = req.body.bio.trim().slice(0, 150);
  }
  if (Array.isArray(req.body?.interestIds)) {
    profile.interestIds = req.body.interestIds.slice(0, 5);
  }
  if (typeof req.body?.avatarRef === "string") {
    profile.avatarRef = req.body.avatarRef;
  }
  res.json({ success: true, profile, interests });
});

router.get("/auth/me", (_req, res) => {
  res.json({
    authenticated: true,
    user: { id: "demo-user-alex", ageConfirmedAt: new Date().toISOString() },
    profile,
  });
});

router.post("/auth/otp/send", (req, res) => {
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  if (phone.length < 5) {
    res.status(422).json({ success: false, error: "INVALID_PHONE", message: "Введите номер телефона." });
    return;
  }
  pendingPhone = phone;
  res.json({ success: true, message: "Код отправлен.", devCode: "000000" });
});

router.post("/auth/otp/verify", (req, res) => {
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : pendingPhone;
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!phone || code !== "000000") {
    res.status(422).json({ success: false, error: "INVALID_CODE", message: "Для demo используйте код 000000." });
    return;
  }
  pendingPhone = phone;
  res.json({ success: true, needsAgeGate: !ageConfirmed, user: { id: "demo-user-alex" }, profile });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true });
});

router.post("/auth/staging-gate", (_req, res) => {
  res.json({ success: true, unlocked: true });
});

router.post("/onboarding/age-gate", (_req, res) => {
  ageConfirmed = true;
  res.json({ success: true, ageBand: profile.ageBand });
});

router.post("/profile/avatar", (_req, res) => {
  res.json({ success: true, avatarRef: profile.avatarRef });
});

router.delete("/profile/avatar", (_req, res) => {
  profile.avatarRef = "/avatars/silhouette-1.svg";
  res.json({ success: true, avatarRef: profile.avatarRef });
});

export default router;