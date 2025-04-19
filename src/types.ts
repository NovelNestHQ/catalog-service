export type BookEvent = {
  eventType: string;
  timestamp: string;
  data: BookData;
};

export type BookData = {
  book_id?: string;
  user_id?: string;
  title?: string;
  created_at?: Date;
  updated_at?: Date;
  author?: { id: string; name: string };
  genre?: { id: string; name: string };
};
