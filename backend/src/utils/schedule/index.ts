import { isNil } from "lodash";
import moment from "moment";
import { logger } from "../../utils/logger";

interface Schedule {
  inActivity?: boolean;
  schedules?: Array<{
    weekdayEn: string;
    startTime: string;
    endTime: string;
  }>;
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

// Mapeamento reverso para validação
const weekdaysReverse = Object.entries(weekdays).reduce((acc, [en, pt]) => {
  acc[pt.toLowerCase()] = en;
  return acc;
}, {} as Record<string, keyof typeof weekdays>);

const formatTime = (time: string): string => {
  if (!time) return "";
  // Remove any non-digit characters
  const digits = time.replace(/\D/g, "");
  // Add colon between hours and minutes
  return digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : time;
};

export const formatScheduleInfo = (schedules: any[]): string => {
  if (!schedules || !Array.isArray(schedules)) {
    return "";
  }

  const formattedSchedules = schedules
    .map(schedule => {
      try {
        // Validação do weekdayEn
        if (!schedule.weekdayEn) {
          logger.warn('Horário sem weekdayEn definido:', schedule);
          return null;
        }

        const weekdayEn = schedule.weekdayEn.toLowerCase();
        const weekday = weekdays[weekdayEn as keyof typeof weekdays];
        
        if (!weekday) {
          logger.warn(`Dia da semana inválido: ${weekdayEn}`);
          return null;
        }

        // Validação dos horários
        const startTime = formatTime(schedule.startTime);
        const endTime = formatTime(schedule.endTime);
        
        if (!startTime || !endTime) {
          logger.warn(`Horários inválidos para ${weekday}:`, { startTime, endTime });
          return null;
        }

        // Validação do formato dos horários
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          logger.warn(`Formato de horário inválido para ${weekday}:`, { startTime, endTime });
          return null;
        }

        return `${weekday}: ${startTime} - ${endTime}`;
      } catch (error) {
        logger.error('Erro ao formatar horário:', error);
        return null;
      }
    })
    .filter((line): line is string => line !== null)
    .sort((a, b) => {
      // Ordena os dias da semana corretamente
      const getDayOrder = (line: string) => {
        const day = line.split(':')[0].toLowerCase();
        return Object.values(weekdays).indexOf(day as any);
      };
      return getDayOrder(a) - getDayOrder(b);
    });

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
  
  // Se não tiver horário configurado para o dia atual, considera fora do expediente
  if (!schedule.schedules || !Array.isArray(schedule.schedules)) return true;
  
  const currentSchedule = schedule.schedules.find(s => 
    s.weekdayEn.toLowerCase() === weekday && 
    s.startTime && 
    s.endTime
  );
  
  // Se não tiver horário configurado para o dia atual, considera fora do expediente
  if (!currentSchedule) return true;
  
  const startTime = moment(currentSchedule.startTime, "HH:mm");
  const endTime = moment(currentSchedule.endTime, "HH:mm");
  
  // Retorna true se estiver antes do horário de início ou depois do horário de fim
  return now.isBefore(startTime) || now.isAfter(endTime);
}; 