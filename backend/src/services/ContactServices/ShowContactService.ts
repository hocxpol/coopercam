import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import AppError from "../../errors/AppError";

const ShowContactService = async (
  id: string | number,
  companyId: number
): Promise<Contact> => {
  const contact = await Contact.findByPk(id, { 
    include: [
      "extraInfo", 
      "whatsapp",
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name"]
      }
    ] 
  });

  if (contact?.companyId !== companyId) {
    throw new AppError("Não é possível excluir registro de outra empresa");
  }

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  return contact;
};

export default ShowContactService;
