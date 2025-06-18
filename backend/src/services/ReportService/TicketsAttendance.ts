import sequelize from "../../database/index";
import { QueryTypes } from "sequelize";
import moment from "moment";

interface Return {
  data: {};
}

interface Request {
  initialDate: string;
  finalDate: string;
  companyId: number;
}

interface DataReturn {
  quantidade: number;
  data?: number;
  nome?: string;
}

interface dataUser {
  name: string;
}

export const TicketsAttendance = async ({ initialDate, finalDate, companyId }: Request): Promise<Return> => {

  // Buscar todos os usuários da empresa
  const sqlUsers = `select u.name from "Users" u where u."companyId" = ${companyId}`

  const users: dataUser[] = await sequelize.query(sqlUsers, { type: QueryTypes.SELECT });

  // Converter datas para considerar fuso horário
  const startDate = moment(initialDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
  const endDate = moment(finalDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

  console.log(`[TicketsAttendance] Buscando tickets de ${startDate} até ${endDate} para companyId: ${companyId}`);

  // CORREÇÃO: Atualizar tickets finalizados sem finishedAt
  const fixSql = `
  UPDATE "TicketTraking" 
  SET "finishedAt" = t."updatedAt"
  FROM "Tickets" t
  WHERE "TicketTraking"."ticketId" = t.id
    AND t."companyId" = ${companyId}
    AND t.status = 'closed'
    AND "TicketTraking"."finishedAt" IS NULL`;

  try {
    console.log(`[TicketsAttendance] Corrigindo tickets sem finishedAt...`);
    await sequelize.query(fixSql, { type: QueryTypes.UPDATE });
    console.log(`[TicketsAttendance] Correção aplicada com sucesso`);
  } catch (error) {
    console.error(`[TicketsAttendance] Erro ao corrigir tickets:`, error);
  }

  // SOLUÇÃO: Consulta modificada para incluir tickets sem userId
  const sql = `
  select
    COUNT(*) AS quantidade,
    COALESCE(u.name, 'Sistema Automático') AS nome
  from
    "TicketTraking" tt
    left join "Users" u on u.id = tt."userId"
  where
    tt."companyId" = ${companyId}
    and "ticketId" is not null
    and tt."finishedAt" is not null
    and tt."finishedAt" >= '${startDate}'
    and tt."finishedAt" <= '${endDate}'
  group by
    COALESCE(u.name, 'Sistema Automático')
  ORDER BY
    COALESCE(u.name, 'Sistema Automático') asc`

  console.log(`[TicketsAttendance] Executando query principal: ${sql}`);

  const data: DataReturn[] = await sequelize.query(sql, { type: QueryTypes.SELECT });

  console.log(`[TicketsAttendance] Resultados encontrados:`, data);

  // Adicionar usuários que não tiveram tickets no período
  users.forEach(user => {
    let indexCreated = data.findIndex((item) => item.nome === user.name);

    if (indexCreated === -1) {
      data.push({ quantidade: 0, nome: user.name })
    }
  });

  console.log(`[TicketsAttendance] Resultado final:`, data);

  return { data };
}
