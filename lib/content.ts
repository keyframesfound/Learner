/* Subject metadata for the chrome (chips, class colours, quickbits cards).
   Notes content is not here: QuickBits pages are authored per chapter and, until
   the first chapter lands, the section stays empty rather than inventing placeholders. */

export type Subject = {
  id: string;
  name: string;
  colour: string;
  d: string;
};

export const subjects: Subject[] = [
  { id: "ict", name: "ICT", colour: "#2D5BFF",
    d: "M2.6 4h18.8v12.4H2.6zM10 16.4h4v2.4h-4zM6.6 18.8h10.8v2.2H6.6z" },
  { id: "science", name: "Science", colour: "#0F7A35",
    d: "M9 3h6v2.6l-.8 2.2a4 4 0 0 1 .8 2.4v1.2h-6V10.2a4 4 0 0 1 .8-2.4L9 5.6zM8 12.6h8l2.2 5.6a2.6 2.6 0 0 1-2.4 3.6H8.2a2.6 2.6 0 0 1-2.4-3.6z" },
  { id: "physics", name: "Physics", colour: "#7C4DFF",
    d: "M13.6 2.4 5.2 13.6h4.9L9.2 21.6 18.8 9.9h-5.3z" },
  { id: "biology", name: "Biology", colour: "#17A34A",
    d: "M19.6 4.2c-8.2-.6-13.4 2.6-14.6 8.4-.6 3 1.2 5.6 4.2 6.6 6.2 2 10.8-3 10.4-15zM8.6 17.8 16 8.4" },
  { id: "chemistry", name: "Chemistry", colour: "#8A4B08",
    d: "M9 3h6v3.4l4.6 11.2c.8 2-1 4.4-3.2 4.4H7.6c-2.2 0-4-2.4-3.2-4.4L9 6.4zM7.4 14h9.2" },
  { id: "geography", name: "Geography", colour: "#1467A8",
    d: "M12 3.2c3.6 0 6.6 3.4 6.6 7.6S12 20.8 12 20.8 5.4 15 5.4 10.8S8.4 3.2 12 3.2zM12 13.4a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z" },
];
