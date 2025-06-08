import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Whatsapp from "../../models/Whatsapp";
import { Model } from "sequelize-typescript";

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
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

const CreateContactService = async ({
  name,
  number,
  email = "",
  companyId,
  extraInfo = [],
  cpf,
  cnpj,
  birthDate,
  gender,
  automation = true,
  internalCode,
  queueId,
  whatsappId
}: Request): Promise<Contact> => {
  // Validação do WhatsApp se fornecido
  if (whatsappId) {
    const whatsapp = await (Whatsapp as typeof Model).findByPk(whatsappId);
    if (!whatsapp) {
      throw new AppError("ERR_WHATSAPP_NOT_FOUND");
    }
  }

  const numberExists = await (Contact as typeof Model).findOne({
    where: { number, companyId }
  });

  if (numberExists) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  const contact = await (Contact as typeof Model).create(
    {
      name,
      number,
      email,
      extraInfo,
      companyId,
      cpf,
      cnpj,
      birthDate,
      gender,
      automation,
      internalCode,
      queueId,
      whatsappId
    },
    {
      include: ["extraInfo"]
    }
  );

  return contact;
};

export default CreateContactService;
