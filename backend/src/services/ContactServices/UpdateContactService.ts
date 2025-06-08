import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Whatsapp from "../../models/Whatsapp";
import { Model } from "sequelize-typescript";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}

interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  extraInfo?: ExtraInfo[];
  cpf?: string;
  cnpj?: string;
  birthDate?: Date;
  gender?: string;
  automation?: boolean;
  internalCode?: string;
  queueId?: number;
  whatsappId?: number;
}

interface Request {
  contactData: ContactData;
  contactId: number;
  companyId: number;
}

const UpdateContactService = async ({
  contactData,
  contactId,
  companyId
}: Request): Promise<Contact> => {
  const { 
    email, 
    name, 
    number, 
    extraInfo,
    cpf,
    cnpj,
    birthDate,
    gender,
    automation,
    internalCode,
    queueId,
    whatsappId
  } = contactData;

  if (whatsappId) {
    const whatsapp = await (Whatsapp as typeof Model).findByPk(whatsappId);
    if (!whatsapp) {
      throw new AppError("ERR_WHATSAPP_NOT_FOUND");
    }
  }

  const contact = await (Contact as typeof Model).findOne({
    where: { id: contactId },
    attributes: [
      "id", 
      "name", 
      "number", 
      "email", 
      "companyId", 
      "profilePicUrl",
      "cpf",
      "cnpj",
      "birthDate",
      "gender",
      "automation",
      "internalCode",
      "queueId",
      "whatsappId"
    ],
    include: ["extraInfo"]
  });

  if (contact?.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (extraInfo) {
    await Promise.all(
      extraInfo.map(async (info: any) => {
        await (ContactCustomField as typeof Model).upsert({ ...info, contactId: contact.id });
      })
    );

    await Promise.all(
      contact.extraInfo.map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);

        if (stillExists === -1) {
          await (ContactCustomField as typeof Model).destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }

  await contact.update({
    name,
    number,
    email,
    cpf,
    cnpj,
    birthDate,
    gender,
    automation,
    internalCode,
    queueId,
    whatsappId
  });

  await contact.reload({
    attributes: [
      "id", 
      "name", 
      "number", 
      "email", 
      "profilePicUrl",
      "cpf",
      "cnpj",
      "birthDate",
      "gender",
      "automation",
      "internalCode",
      "queueId",
      "whatsappId"
    ],
    include: ["extraInfo"]
  });

  return contact;
};

export default UpdateContactService;
