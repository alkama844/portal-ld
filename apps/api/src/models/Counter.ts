import { Schema, model } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { _id: false }
);

export const Counter = model<ICounter>('Counter', counterSchema);

export async function getNextSequenceValue(sequenceName: string, minStart: number = 1000): Promise<number> {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!sequenceDocument) return minStart + 1;
  
  if (sequenceDocument.seq <= minStart) {
    const updated = await Counter.findByIdAndUpdate(
      sequenceName,
      { $set: { seq: minStart + 1 } },
      { new: true }
    );
    return updated ? updated.seq : minStart + 1;
  }
  return sequenceDocument.seq;
}
