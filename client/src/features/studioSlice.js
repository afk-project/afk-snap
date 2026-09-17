import { createSlice } from "@reduxjs/toolkit";

const studioSlice = createSlice({
  name: "studio",
  initialState: {
    mode: "studio",
    generationType: "solo-real",
    style: "photorealistic",
    format: "square",
    layout: 2,
    prompt: "",
    templateId: null,
    frameTemplate: "foto-dulu",
  },
  reducers: {
    updateStudio: (state, action) => Object.assign(state, action.payload),
    resetStudio: () => ({
      mode: "studio",
      generationType: "solo-real",
      style: "photorealistic",
      format: "square",
      layout: 2,
      prompt: "",
      templateId: null,
      frameTemplate: "foto-dulu",
    }),
  },
});

export const { updateStudio, resetStudio } = studioSlice.actions;
export default studioSlice.reducer;
