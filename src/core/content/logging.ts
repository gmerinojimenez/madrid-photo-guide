export type DiscardedPiece = {
  collection: string;
  id: string | null;
  reason: string;
};

export interface ContentLogger {
  discarded(piece: DiscardedPiece): void;
}
