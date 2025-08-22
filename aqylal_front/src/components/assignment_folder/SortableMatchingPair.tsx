import React, { memo } from "react";
import { MatchingPair } from "../utils/assignmentUtils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, TextField, IconButton, FormControlLabel, Switch } from "@mui/material";
import { DragIndicator as DragIndicatorIcon, Delete as DeleteIcon } from "@mui/icons-material";

interface SortableMatchingPairProps {
  pair: MatchingPair;
  index: number;
  updateMatchingPair: (index: number, field: keyof MatchingPair, value: string | boolean) => void;
  removeMatchingPair: (index: number) => void;
}

const SortableMatchingPair: React.FC<SortableMatchingPairProps> = memo(({ pair, index, updateMatchingPair, removeMatchingPair }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: pair.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Box ref={setNodeRef} style={style} sx={{ display: "flex", gap: 2, mb: 1, alignItems: "center" }}>
      <IconButton {...attributes} {...listeners}><DragIndicatorIcon /></IconButton>
      <TextField
        label="Left"
        value={pair.left}
        onChange={(e) => updateMatchingPair(index, "left", e.target.value)}
        sx={{ flex: 1 }}
      />
      <TextField
        label="Right"
        value={pair.right}
        onChange={(e) => updateMatchingPair(index, "right", e.target.value)}
        sx={{ flex: 1 }}
      />
      <FormControlLabel
        control={<Switch checked={pair.correct} onChange={(e) => updateMatchingPair(index, "correct", e.target.checked)} />}
        label="Correct"
      />
      <IconButton onClick={() => removeMatchingPair(index)}><DeleteIcon /></IconButton>
    </Box>
  );
});

export default SortableMatchingPair;