import { isNil } from "lodash";
import moment from "moment";

interface Schedule {
  inActivity?: boolean;
  schedules?: Array<{
    weekdayEn: string;
    startTime: string;
    endTime: string;
  }>;
}

const weekdays = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

const formatTime = (time: string): string => {
  if (!time) return "";
  // Remove any non-digit characters
  const digits = time.replace(/\D/g, "");
  // Add colon between hours and minutes
  return digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : time;
};

export const formatScheduleInfo = (schedules: any[]): string => {
  if (!schedules || !Array.isArray(schedules)) return "";

  return schedules
    .map(schedule => {
      const weekday = weekdays[schedule.weekdayEn as keyof typeof weekdays] || schedule.weekdayEn;
      const startTime = formatTime(schedule.startTime);
      const endTime = formatTime(schedule.endTime);
      return `${weekday}: ${startTime} - ${endTime}`;
    })
    .join("\n");
};

export const formatOutOfHoursMessage = (message: string | null, scheduleInfo: string): string | null => {
  if (!message) return null;
  return `${message}\n\n*Horários de Funcionamento:*\n\n${scheduleInfo}`;
};

export const isOutOfHours = (schedule: Schedule | null): boolean => {
  if (isNil(schedule)) return false;
  
  const now = moment();
  const weekday = now.format("dddd").toLowerCase();
  
  // Se não tiver horário configurado para o dia atual
  if (!schedule.schedules || !Array.isArray(schedule.schedules)) return false;
  
  const currentSchedule = schedule.schedules.find(s => 
    s.weekdayEn === weekday && 
    s.startTime && 
    s.endTime
  );
  
  if (!currentSchedule) return false;
  
  const startTime = moment(currentSchedule.startTime, "HH:mm");
  const endTime = moment(currentSchedule.endTime, "HH:mm");
  
  // Retorna true se estiver antes do horário de início ou depois do horário de fim
  return now.isBefore(startTime) || now.isAfter(endTime);
}; 