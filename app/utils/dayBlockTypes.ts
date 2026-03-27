export type YoutubeBlock = {
  type: "youtube";
  url: string;
};

export type RatingBlock = {
  type: "rating";
  id: string;
  label?: string;
};

export type TextInputBlock = {
  type: "text_input";
  id: string;
  label?: string;
  placeholder?: string;
};

export type DayBlock = YoutubeBlock | RatingBlock | TextInputBlock;

export type BlockResponses = Record<string, string | number>;
