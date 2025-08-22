import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
} from "@mui/material";
import { motion } from "framer-motion";
import { Add as AddIcon, List as ListIcon } from "@mui/icons-material";

const buttonVariants = {
  hover: {
    scale: 1.05,
    boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.2)",
    transition: {
      duration: 0.3,
      yoyo: Infinity,
    },
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const Assignments = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        py: 2, // Уменьшаем вертикальный отступ
        pl: 0, // Убираем отступ слева
        bgcolor: "transparent",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleNavigation("/create-assignment")}
            sx={{
              bgcolor: "linear-gradient(45deg, #ff6f61 30%, #ff8a65 90%)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "1.1rem",
              py: 2,
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(255, 111, 97, 0.4)",
              "&:hover": {
                bgcolor: "linear-gradient(45deg, #ff8a65 30%, #ff6f61 90%)",
                boxShadow: "0 6px 20px rgba(255, 111, 97, 0.6)",
              },
              transition: "all 0.3s ease",
            }}
            fullWidth
          >
            Создать задание
          </Button>
        </motion.div>

        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            variant="contained"
            startIcon={<ListIcon />}
            onClick={() => handleNavigation("/teacher-assignments")}
            sx={{
              bgcolor: "linear-gradient(45deg, #0288d1 30%, #03a9f4 90%)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "1.1rem",
              py: 2,
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(2, 136, 209, 0.4)",
              "&:hover": {
                bgcolor: "linear-gradient(45deg, #03a9f4 30%, #0288d1 90%)",
                boxShadow: "0 6px 20px rgba(2, 136, 209, 0.6)",
              },
              transition: "all 0.3s ease",
            }}
            fullWidth
          >
            Мои задания
          </Button>
        </motion.div>
      </Box>
    </Box>
  );
};

export default Assignments;