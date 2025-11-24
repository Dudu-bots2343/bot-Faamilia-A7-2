// ===================== KEEP ALIVE (Render / Replit) =====================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));

// ===================== DOTENV =====================
require("dotenv").config();

// ===================== DISCORD BOT =====================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===================== ENV VARS =====================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;

// ===================== BOT ONLINE =====================
client.on("ready", async () => {
  console.log(`Bot ligado como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Familia A7")
    .setDescription(
      "Registro A7.\n\n Solicite Set , usando os botões abaixo.\n Registre-se Abaixo."
    )
    .addFields({
      name: "📌 Observações",
      value: "• A resenha aqui e garantida.\n• Nao leve a brincadeira a serio.",
    })
    .setColor("#f1c40f");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirRegistro")
      .setLabel("Registro")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [btn] });
});

// ===================== ABRIR MODAL =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirRegistro") return;

  const modal = new ModalBuilder()
    .setCustomId("modalRegistro")
    .setTitle("Solicitação de Set");

  const nome = new TextInputBuilder()
    .setCustomId("nome")
    .setLabel("Seu nome *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const id = new TextInputBuilder()
    .setCustomId("iduser")
    .setLabel("Seu ID *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(id)
  );

  await interaction.showModal(modal);
});

// ===================== RECEBER FORMULÁRIO =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalRegistro") return;

  const nome = interaction.fields.getTextInputValue("nome");
  const iduser = interaction.fields.getTextInputValue("iduser");

  const canal = await client.channels.fetch(CANAL_ACEITA_SET);

  const embed = new EmbedBuilder()
    .setTitle("Novo Pedido de Registro")
    .setColor("#3498db")
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "Usuário", value: `${interaction.user}` },
      { name: "Nome Informado", value: nome },
      { name: "ID Informado", value: iduser },
      {
        name: "Conta Criada em",
        value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`,
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${interaction.user.id}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`negar_${interaction.user.id}`)
      .setLabel("Negar")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });

  await interaction.reply({
    content: "Seu pedido foi enviado!",
    ephemeral: true,
  });
});

// ===================== APROVAR / NEGAR =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);

  const embed = interaction.message.embeds[0];
  const nomeInformado = embed.fields.find(f => f.name === "Nome Informado")?.value;

  // ===================== APROVAR =====================
  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);

      await membro.roles.add([
        CARGO_APROVADO,
        CARGO_APROVADO_2,
      ]);

      // Embed bonito de aprovado
      const aprovadoEmbed = new EmbedBuilder()
        .setTitle("Registro Aprovado")
        .setColor("#00ff73")
        .setThumbnail(membro.user.displayAvatarURL())
        .addFields(
          { name: "Usuário", value: `${membro}` },
          { name: "ID", value: embed.fields[2].value },
          { name: "Nome Informado", value: nomeInformado },
          { name: "Aprovado por", value: `${interaction.user}` }
        )
        .setFooter({ text: "Aprovado com sucesso!" });

      await interaction.message.edit({
        embeds: [aprovadoEmbed],
        components: [],
      });

      await interaction.reply({
        content: "Aprovado!",
        ephemeral: true,
      });

    } catch (e) {
      console.log(e);
      await interaction.reply({
        content: "❌ Erro ao aprovar. O bot precisa de permissões.",
        ephemeral: true,
      });
    }
  }

  // ===================== NEGAR =====================
  if (acao === "negar") {
    try {
      await membro.kick("Registro negado.");

      const negadoEmbed = new EmbedBuilder()
        .setTitle("Registro Negado")
        .setColor("#ff0000")
        .addFields(
          { name: "Usuário", value: `${membro}` },
          { name: "Negado por", value: `${interaction.user}` }
        );

      await interaction.message.edit({
        embeds: [negadoEmbed],
        components: [],
      });

      await interaction.reply({
        content: "Negado!",
        ephemeral: true,
      });

    } catch (e) {
      console.log(e);
      await interaction.reply({
        content: "❌ Não consegui expulsar o usuário. Verifique permissões.",
        ephemeral: true,
      });
    }
  }
});


// ======================================================================
// =====================   COMANDO !addcargo   ==========================
// ======================================================================
client.on("messageCreate", async message => {
  if (!message.content.startsWith("!addcargo")) return;

  const args = message.content.split(" ");
  const cargo = message.mentions.roles.first();
  const usuario = message.mentions.members.first();

  if (!cargo || !usuario) {
    return message.reply("❌ Use: `!addcargo @cargo @pessoa`");
  }

  await message.delete().catch(() => {});

  try {
    await usuario.roles.add(cargo.id);

    const embed = new EmbedBuilder()
      .setTitle("Família A7")
      .setColor("#00ff9d")
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: "Cargo:", value: `${cargo} (${cargo.id})` },
        { name: "Cargo setado com sucesso no:", value: `${usuario}` },
        { name: "Quem setou:", value: `${message.author}` }
      );

    const msg = await message.channel.send({ embeds: [embed] });

    setTimeout(() => msg.delete().catch(() => {}), 20000);

  } catch (e) {
    const erro = new EmbedBuilder()
      .setTitle("Família A7")
      .setColor("#ff0000")
      .addFields(
        { name: "❌ Erro:", value: "Não consegui setar o cargo." }
      );

    const msg = await message.channel.send({ embeds: [erro] });

    setTimeout(() => msg.delete().catch(() => {}), 20000);
  }
});


// ======================================================================
// =====================   COMANDO !removercargo   ======================
// ======================================================================
client.on("messageCreate", async message => {
  if (!message.content.startsWith("!removercargo")) return;

  const args = message.content.split(" ");
  const cargo = message.mentions.roles.first();
  const usuario = message.mentions.members.first();

  if (!cargo || !usuario) {
    return message.reply("❌ Use: `!removercargo @cargo @pessoa`");
  }

  await message.delete().catch(() => {});

  try {
    await usuario.roles.remove(cargo.id);

    const embed = new EmbedBuilder()
      .setTitle("Família A7")
      .setColor("#ff6600")
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: "Cargo Removido:", value: `${cargo} (${cargo.id})` },
        { name: "Cargo removido do:", value: `${usuario}` },
        { name: "Quem removeu:", value: `${message.author}` }
      );

    const msg = await message.channel.send({ embeds: [embed] });

    setTimeout(() => msg.delete().catch(() => {}), 20000);

  } catch (e) {
    const erro = new EmbedBuilder()
      .setTitle("Família A7")
      .setColor("#ff0000")
      .addFields(
        { name: "❌ Erro:", value: "Não consegui remover o cargo." }
      );

    const msg = await message.channel.send({ embeds: [erro] });

    setTimeout(() => msg.delete().catch(() => {}), 20000);
  }
});


// ===================== LOGIN =====================
client.login(TOKEN);
