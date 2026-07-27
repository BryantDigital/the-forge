export type EventStatus = "scheduled" | "open" | "full";

export type ForgeEvent = {
  slug: string;
  title: string;
  excerpt: string;
  description: string[];
  dateLabel: string;
  month: string;
  day: string;
  time: string;
  location: string;
  locationShort: string;
  image: string;
  capacity: number;
  registered: number;
  waitlisted: number;
  status: EventStatus;
  registrationLabel: string;
};

export const forgeValues = [
  {
    letter: "F",
    title: "Follow Christ",
    line: "Everything starts here.",
    description: "Faith is not on the sidelines. It is the foundation every boy builds on.",
    verse: "John 8:12",
  },
  {
    letter: "O",
    title: "Overcome Challenges",
    line: "Your limit is further than you think.",
    description: "Hard work reveals that a boy is stronger than his excuses.",
    verse: "Philippians 4:13",
  },
  {
    letter: "R",
    title: "Reflect His Strength",
    line: "Strong body. Stronger character.",
    description: "True strength shows up in integrity, humility, and how we treat others.",
    verse: "1 Corinthians 16:13–14",
  },
  {
    letter: "G",
    title: "Grow in Faith",
    line: "Faith is not inherited. It is built.",
    description: "Boys wrestle with Scripture and develop a personal relationship with Christ.",
    verse: "2 Peter 3:18",
  },
  {
    letter: "E",
    title: "Endure With Purpose",
    line: "Grit with a reason behind it.",
    description: "Purpose turns hard days and sore muscles into formation.",
    verse: "Hebrews 12:1",
  },
];

export const upcomingEvents: ForgeEvent[] = [
  {
    slug: "the-forge-september-12",
    title: "The Forge — September 12",
    excerpt: "Games, challenges, competition, Scripture, and brotherhood.",
    description: [
      "Join us this month for the best in games, challenges, and competitions.",
      "Learn with us as we talk about discipline, character, morals, and how to live a Godly life in Christ.",
    ],
    dateLabel: "September 12, 2026",
    month: "SEP",
    day: "12",
    time: "3:00–6:00 PM",
    location: "Venue to be announced · Virginia Beach, VA",
    locationShort: "Virginia Beach",
    image: "/images/forge-brotherhood.jpg",
    capacity: 30,
    registered: 0,
    waitlisted: 0,
    status: "scheduled",
    registrationLabel: "Sep 1",
  },
];

export const roster = [
  { name: "Caleb Anderson", age: 12, checkedIn: true, notes: "" },
  { name: "Micah Bennett", age: 10, checkedIn: true, notes: "Peanut allergy" },
  { name: "Noah Carter", age: 14, checkedIn: false, notes: "" },
  { name: "Eli Davis", age: 11, checkedIn: true, notes: "" },
  { name: "Isaiah Foster", age: 13, checkedIn: false, notes: "Asthma — inhaler with parent" },
  { name: "James Harris", age: 9, checkedIn: true, notes: "" },
  { name: "Liam Jackson", age: 15, checkedIn: false, notes: "" },
  { name: "Daniel Lewis", age: 12, checkedIn: true, notes: "" },
];
