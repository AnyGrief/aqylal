import React, { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  TextField,
} from "@mui/material";
import { Save as SaveIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from "@mui/icons-material";
import { getUserProfile, updateUserProfile, changePassword, changeLanguage, getSubjects } from "../api";
import { useForm, Controller } from "react-hook-form";

// Стили для TextField
const textFieldStyles = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    "&:hover fieldset": {
      borderColor: "primary.main",
    },
    "&.Mui-focused fieldset": {
      borderColor: "primary.main",
      boxShadow: "0 0 5px rgba(0, 123, 255, 0.3)",
    },
  },
};

// Стили для Select
const selectStyles = {
  borderRadius: "8px",
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "primary.main",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "primary.main",
  },
};

// Стили для кнопок
const buttonStyles = {
  borderRadius: "8px",
  textTransform: "none",
  fontWeight: "bold",
  py: 1.5,
  "&:hover": {
    backgroundColor: "primary.dark",
  },
};

// Настройка для выпадающего списка (максимум 5 элементов)
const menuProps = {
  PaperProps: {
    style: {
      maxHeight: 288,
      width: 250,
    },
  },
};

// Оборачиваем Settings в memo, чтобы избежать лишних перерисовок
const Settings = memo(() => {
  const [user, setUser] = useState(null);
  const [subjectsListDynamic, setSubjectsListDynamic] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      patronymic: "",
      login: "",
      phone: "",
      grade: "",
      gradeLetter: "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
      language: "ru",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profile = await getUserProfile();
        setUser(profile);
        setValue("firstName", profile.first_name || "");
        setValue("lastName", profile.last_name || "");
        setValue("patronymic", profile.patronymic || "");
        setValue("login", profile.login || "");
        setValue("phone", profile.phone || "");
        if (profile.role_id === 3 && Array.isArray(profile.subject)) {
          setSubjects(profile.subject);
        }
        if (profile.role_id === 4) {
          const gradeValue = profile.grade ? String(profile.grade) : "";
          setValue("grade", gradeValue);
          setValue("gradeLetter", profile.grade_letter || "");
        }
        const languageValue = profile.language || "ru";
        setValue("language", languageValue);

        if (profile.role_id === 3) {
          setSubjectsLoading(true);
          try {
            const subjectsData = await getSubjects();
            setSubjectsListDynamic(subjectsData || []);
          } catch (err) {
            setError("Не удалось загрузить список предметов");
            setSubjectsListDynamic([]);
          } finally {
            setSubjectsLoading(false);
          }
        }
      } catch (err) {
        navigate("/login");
      }
    };
    fetchData();
  }, [navigate, setValue]);

  const onProfileSubmit = async (data) => {
    try {
      setError(null);
      setSuccess(null);

      const nameRegex = /^[A-Za-zА-Яа-яӘІҢҒҮҰҚӨҺәіңғүұқөһ]+$/;
      if (!data.firstName.match(nameRegex)) {
        setError("Имя должно содержать только буквы (латиница, кириллица, казахский алфавит), без пробелов");
        return;
      }
      if (!data.lastName.match(nameRegex)) {
        setError("Фамилия должна содержать только буквы (латиница, кириллица, казахский алфавит), без пробелов");
        return;
      }
      if (data.patronymic && !data.patronymic.match(nameRegex)) {
        setError("Отчество должно содержать только буквы (латиница, кириллица, казахский алфавит), без пробелов");
        return;
      }

      if (data.phone) {
        const phoneNumber = data.phone.replace(/^\+/, "");
        if (!phoneNumber.match(/^\d+$/)) {
          setError("Телефон должен содержать только цифры");
          return;
        }
        const phoneRegex = /^(?:\+7|8)(?:70[0-2|5-7|9]|747|77[0-2|5-7])[0-9]{7}$/;
        if (!data.phone.match(phoneRegex)) {
          setError("Номер телефона должен быть в формате +77012345678 или 87012345678");
          return;
        }
      }

      const profileData = {
        first_name: data.firstName,
        last_name: data.lastName,
        patronymic: data.patronymic || undefined,
        login: data.login || undefined,
        phone: data.phone ? data.phone.replace(/^\+/, "") : undefined,
      };
      if (user?.role_id === 3) {
        profileData.subject = subjects;
      }
      if (user?.role_id === 4) {
        profileData.grade = data.grade;
        profileData.grade_letter = data.gradeLetter.toUpperCase();
      }

      const response = await updateUserProfile(profileData);
      setSuccess("Профиль успешно обновлён");

      if (response.data.newUserId) {
        setSuccess("Роль изменена, пожалуйста, войдите заново");
        setTimeout(() => navigate("/login"), 2000);
      }

      const updatedProfile = await getUserProfile();
      setUser(updatedProfile);
      setValue("firstName", updatedProfile.first_name || "");
      setValue("lastName", updatedProfile.last_name || "");
      setValue("patronymic", updatedProfile.patronymic || "");
      setValue("login", updatedProfile.login || "");
      setValue("phone", updatedProfile.phone || "");
      if (updatedProfile.role_id === 3 && Array.isArray(updatedProfile.subject)) {
        setSubjects(updatedProfile.subject);
      }
      if (updatedProfile.role_id === 4) {
        setValue("grade", updatedProfile.grade ? String(updatedProfile.grade) : "");
        setValue("gradeLetter", updatedProfile.grade_letter || "");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось обновить профиль");
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      setError(null);
      setSuccess(null);

      if (data.newPassword.length < 8) {
        setError("Новый пароль должен содержать минимум 8 символов");
        return;
      }

      if (data.newPassword !== data.confirmPassword) {
        setError("Новый пароль и подтверждение не совпадают");
        return;
      }

      await changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setSuccess("Пароль успешно изменён");
      setValue("oldPassword", "");
      setValue("newPassword", "");
      setValue("confirmPassword", "");
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось изменить пароль");
    }
  };

  const onLanguageSubmit = async (data) => {
    try {
      setError(null);
      setSuccess(null);
      await changeLanguage({ language: data.language });
      setSuccess("Язык успешно изменён");
    } catch (err) {
      setError(err.response?.data?.error || "Не удалось изменить язык");
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^0-9+]/g, "");
    if (value.startsWith("+")) {
      value = "+" + value.slice(1).replace(/\+/g, "");
    } else {
      value = value.replace(/\+/g, "");
    }
    if (value.startsWith("+")) {
      value = value.slice(0, 12);
    } else {
      value = value.slice(0, 11);
    }
    setValue("phone", value);
  };

  const handleGradeLetterChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^А-ЯA-Z]/g, "").slice(0, 1);
    setValue("gradeLetter", value);
  };

  const handleNameChange = (e, fieldName) => {
    const value = e.target.value.replace(/[^A-Za-zА-Яа-яӘІҢҒҮҰҚӨҺәіңғүұқөһ]/g, "");
    setValue(fieldName, value);
  };

  const ProfileTab = memo(() => (
    <form onSubmit={handleSubmit(onProfileSubmit)}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "400px" }}>
        <TextField
          label="Имя *"
          variant="outlined"
          fullWidth
          {...register("firstName", { required: "Имя обязательно", maxLength: 50 })}
          onChange={(e) => handleNameChange(e, "firstName")}
          error={!!errors.firstName}
          helperText={errors.firstName?.message || "Только буквы (латиница, кириллица, казахский алфавит), без пробелов"}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        <TextField
          label="Фамилия *"
          variant="outlined"
          fullWidth
          {...register("lastName", { required: "Фамилия обязательна", maxLength: 50 })}
          onChange={(e) => handleNameChange(e, "lastName")}
          error={!!errors.lastName}
          helperText={errors.lastName?.message || "Только буквы (латиница, кириллица, казахский алфавит), без пробелов"}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        <TextField
          label="Отчество"
          variant="outlined"
          fullWidth
          {...register("patronymic", { maxLength: 50 })}
          onChange={(e) => handleNameChange(e, "patronymic")}
          error={!!errors.patronymic}
          helperText={errors.patronymic?.message || "Только буквы (латиница, кириллица, казахский алфавит), без пробелов"}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          value={user?.email || ""}
          disabled
          sx={{ ...textFieldStyles, mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          Для изменения email обратитесь к администрации школы
        </Typography>
        <TextField
          label="Логин"
          variant="outlined"
          fullWidth
          {...register("login", { maxLength: 50 })}
          disabled={!!watch("login")}
          sx={{ ...textFieldStyles, mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          {watch("login") ? "Для изменения логина обратитесь к администрации школы" : "Заполните логин, если он отсутствует"}
        </Typography>
        <TextField
          label="Телефон"
          variant="outlined"
          fullWidth
          {...register("phone")}
          onChange={handlePhoneChange}
          placeholder="Например, +77012345678 или 87012345678"
          error={!!errors.phone}
          helperText={errors.phone?.message || "Формат: +77012345678 или 87012345678"}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        {user?.role_id === 3 && (
          subjectsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : subjectsListDynamic.length === 0 ? (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              Список предметов пуст или не удалось загрузить данные
            </Typography>
          ) : (
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>Предметы</InputLabel>
              <Select
                multiple
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                label="Предметы"
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} color="primary" size="small" sx={{ borderRadius: "8px" }} />
                    ))}
                  </Box>
                )}
                sx={selectStyles}
                MenuProps={menuProps}
              >
                {subjectsListDynamic.map((subj) => (
                  <MenuItem key={subj} value={subj}>
                    {subj}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )
        )}
        {user?.role_id === 4 && (
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <FormControl sx={{ width: "60%" }} variant="outlined">
              <InputLabel>Класс *</InputLabel>
              <Controller
                name="grade"
                control={control}
                rules={{ required: "Выберите класс" }}
                render={({ field }) => (
                  <Select
                    {...field}
                    label="Класс"
                    sx={selectStyles}
                    onChange={(e) => field.onChange(e.target.value)}
                    value={field.value || ""}
                  >
                    {[...Array(11)].map((_, i) => (
                      <MenuItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.grade && (
                <Typography variant="caption" color="error">
                  {errors.grade.message}
                </Typography>
              )}
            </FormControl>
            <Box sx={{ width: "30%" }}>
              <TextField
                label="Литера класса *"
                variant="outlined"
                fullWidth
                {...register("gradeLetter", {
                  required: "Введите литеру класса",
                })}
                onChange={handleGradeLetterChange}
                placeholder="Например, А, Б"
                error={!!errors.gradeLetter}
                helperText={errors.gradeLetter?.message || "Только одна заглавная буква (например, А, Б)"}
                sx={textFieldStyles}
              />
            </Box>
          </Box>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          sx={{ ...buttonStyles, maxWidth: "200px" }}
        >
          Сохранить
        </Button>
      </Box>
    </form>
  ));

  const PasswordTab = memo(() => (
    <form onSubmit={handleSubmit(onPasswordSubmit)}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "400px" }}>
        <TextField
          label="Старый пароль *"
          variant="outlined"
          type="password"
          fullWidth
          {...register("oldPassword", { required: "Старый пароль обязателен", maxLength: 50 })}
          error={!!errors.oldPassword}
          helperText={errors.oldPassword?.message}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        <TextField
          label="Новый пароль *"
          variant="outlined"
          type="password"
          fullWidth
          {...register("newPassword", { required: "Новый пароль обязателен", maxLength: 50 })}
          error={!!errors.newPassword}
          helperText={errors.newPassword?.message}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        <TextField
          label="Подтвердить новый пароль *"
          variant="outlined"
          type="password"
          fullWidth
          {...register("confirmPassword", {
            required: "Подтверждение пароля обязательно",
            maxLength: 50,
          })}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          sx={{ ...textFieldStyles, mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          sx={{ ...buttonStyles, maxWidth: "200px" }}
        >
          Изменить пароль
        </Button>
      </Box>
    </form>
  ));

  const LanguageTab = memo(() => (
    <form onSubmit={handleSubmit(onLanguageSubmit)}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "400px" }}>
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel>Язык</InputLabel>
          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                label="Язык"
                sx={selectStyles}
                onChange={(e) => field.onChange(e.target.value)}
                value={field.value || "ru"}
              >
                <MenuItem value="ru">Русский</MenuItem>
                <MenuItem value="kz">Казахский</MenuItem>
              </Select>
            )}
          />
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          sx={{ ...buttonStyles, maxWidth: "200px" }}
        >
          Сохранить
        </Button>
      </Box>
    </form>
  ));

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", alignItems: "flex-start", pl: 0 }}>
      <Tabs
        value={tab}
        onChange={(e, newValue) => setTab(newValue)}
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            fontWeight: "bold",
            textTransform: "none",
            fontSize: "1rem",
            color: "text.secondary",
            "&.Mui-selected": {
              color: "primary.main",
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "primary.main",
            height: 3,
          },
        }}
      >
        <Tab label="Профиль" />
        <Tab label="Пароль" />
        <Tab label="Язык" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, maxWidth: "400px" }} icon={<ErrorIcon />}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2, maxWidth: "400px" }} icon={<CheckCircleIcon />}>
          {success}
        </Alert>
      )}

      {tab === 0 && <ProfileTab />}
      {tab === 1 && <PasswordTab />}
      {tab === 2 && <LanguageTab />}
    </Box>
  );
});

export default Settings;