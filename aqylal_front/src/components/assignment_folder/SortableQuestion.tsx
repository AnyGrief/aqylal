import React, { memo } from "react";
import { Question } from "../utils/assignmentUtils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, Box, Typography, IconButton, Tooltip } from "@mui/material";
import { DragIndicator as DragIndicatorIcon, Delete as DeleteIcon } from "@mui/icons-material";

interface SortableQuestionProps {
  question: Question;
  id: string;
  index: number;
  currentQuestionId: string | null;
  setCurrentQuestionId: (id: string) => void;
  deleteQuestion: (id: string) => void;
}

const SortableQuestion: React.FC<SortableQuestionProps> = memo(
  ({ question, id, index, currentQuestionId, setCurrentQuestionId, deleteQuestion }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        sx={{
          mb: 1,
          bgcolor: currentQuestionId === id ? "primary.light" : "white",
          "&:hover": { boxShadow: 3 },
          position: "relative",
          pr: 5,
        }}
        onClick={() => setCurrentQuestionId(id)}
      >
        <CardContent sx={{ display: "flex", alignItems: "center", p: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <IconButton {...attributes} {...listeners}>
              <DragIndicatorIcon />
            </IconButton>
            <Tooltip
              title={question.question || "Новое задание"}
              placement="top"
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: "grey.900",
                    color: "white",
                    fontSize: "0.875rem",
                    maxWidth: 300,
                    p: 1,
                    borderRadius: 1,
                    boxShadow: 3,
                    transition: "opacity 0.2s ease-in-out",
                  },
                },
              }}
            >
              <Typography
                sx={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "200px",
                }}
              >
                {`${index + 1}. ${question.question || "Новое задание"}`}
              </Typography>
            </Tooltip>
          </Box>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              deleteQuestion(id);
            }}
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <DeleteIcon />
          </IconButton>
        </CardContent>
      </Card>
    );
  }
);

export default SortableQuestion;