import { isNil } from "lodash";
import moment from "moment";
import { logger } from "../../utils/logger";

interface Schedule {
  weekdayEn: string;
  startTime: string;
  endTime: string;
  inActivity?: boolean;
}

// Mapeamento bidirecional para garantir consistência
const weekdays = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
} as const;

type WeekdayKey = keyof typeof weekdays;
type WeekdayValue = typeof weekdays[WeekdayKey];

// Mapeamento reverso para validação
const weekdaysReverse = Object.entries(weekdays).reduce((acc, [en, pt]) => {
  acc[pt.toLowerCase()] = en as WeekdayKey;
  return acc;
}, {} as Record<string, WeekdayKey>);

const formatTime = (time: string): string => {
  if (!time) return "";
  // Remove any non-digit characters
  const digits = time.replace(/\D/g, "");
  // Add colon between hours and minutes
  return digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : time;
};

export const formatScheduleInfo = (schedules: Schedule[]): string => {
  if (!schedules || !Array.isArray(schedules)) {
    return "";
  }

  const formattedSchedules = schedules
    .map(schedule => {
      // Converte o weekdayEn para o nome em português
      const weekday = weekdays[schedule.weekdayEn?.toLowerCase() as keyof typeof weekdays];
      const startTime = formatTime(schedule.startTime);
      const endTime = formatTime(schedule.endTime);
      
      if (!weekday || !startTime || !endTime) return null;
      
      return `${weekday}: ${startTime} - ${endTime}`;
    })
    .filter(Boolean);

  return formattedSchedules.join("\n");
};

export const formatOutOfHoursMessage = (message: string | null, scheduleInfo: string): string | null => {
  if (!message) return null;
  
  // Se não houver horários configurados, retorna apenas a mensagem
  if (!scheduleInfo || scheduleInfo.trim() === "") {
    return message;
  }
  
  return `${message}\n\n*Horários de Funcionamento:*\n${scheduleInfo}`;
};

export const isOutOfHours = (schedule: Schedule | null): boolean => {
  if (isNil(schedule)) return true;
  
  const now = moment();
  const weekday = now.format("dddd").toLowerCase();
  
  // Se não tiver horário configurado, considera fora do expediente
  if (!schedule.weekdayEn || !schedule.startTime || !schedule.endTime) return true;
  
  // Se não for o dia atual, considera fora do expediente
  if (schedule.weekdayEn.toLowerCase() !== weekday) return true;
  
  const startTime = moment(schedule.startTime, "HH:mm");
  const endTime = moment(schedule.endTime, "HH:mm");
  
  // Retorna true se estiver antes do horário de início ou depois do horário de fim
  return now.isBefore(startTime) || now.isAfter(endTime);
}; 