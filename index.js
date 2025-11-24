// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));

// ====================== DOTENV ==========================
require("dotenv").config();

// ====================== DISCORD.JS =======================
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

// ====================== VARIÁVEIS DO .ENV =================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;

// ====================== BOT ONLINE ========================
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
      value: `• A resenha aqui e garantida.\n• Não leve a brincadeira a sério.`,
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

// ====================== ABRIR MODAL ========================
client.on(Events.InteractionCreate, async (interaction) => {
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

// ====================== RECEBER FORM ========================
client.on(Events.InteractionCreate, async (interaction) => {
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
        value: `<t:${Math.floor(
          interaction.user.createdTimestamp / 1000
        )}:R>`,
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

// ====================== APROVAR / NEGAR =====================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);

  // pegar nome informado
  const embed = interaction.message.embeds[0];
  const nomeInformado = embed.fields.find(
    (f) => f.name === "Nome Informado"
  )?.value;

  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);

      await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

      // remover botões
      await interaction.message.edit({ components: [] });

      await interaction.reply({
        content:
          `✔ Registro aprovado!\n` +
          `• Nick alterado para **A7 ${nomeInformado}**\n` +
          `• Cargos aplicados.\n` +
          `• Acesso liberado para ${membro}.`,
      });
    } catch (err) {
      console.log(err);
      return interaction.reply({
        content: "❌ Erro ao aprovar. Verifique permissões.",
        ephemeral: true,
      });
    }
  }

  if (acao === "negar") {
    try {
      await membro.kick("Registro negado pelo aprovador.");

      await interaction.message.edit({ components: [] });

      await interaction.reply({
        content:
          `❌ Registro negado!\n` +
          `• O usuário **${membro.user.tag}** foi expulso do servidor.`,
      });
    } catch (err) {
      console.log(err);
      return interaction.reply({
        content: "❌ Não consegui expulsar. Permissão insuficiente.",
        ephemeral: true,
      });
    }
  }
});

// ====================== COMANDO !addcargo ======================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith("!addcargo")) return;

  if (!message.member.permissions.has("ManageRoles"))
    return message.reply("❌ Você não tem permissão para isso.");

  const args = message.content.split(" ").slice(1);
  const cargo = message.mentions.roles.first();
  const targetId = args[1];

  if (!cargo)
    return message.reply("❌ Use: `!addcargo @cargo 123456789`");

  if (!targetId)
    return message.reply("❌ Você deve informar o **ID do usuário**.");

  let membro;
  try {
    membro = await message.guild.members.fetch(targetId);
  } catch {
    return message.reply("❌ Não encontrei ninguém com esse ID.");
  }

  try {
    await membro.roles.add(cargo.id);

    message.reply(
      `✅ Cargo **${cargo.name}** aplicado ao usuário **${membro.user.tag}**.`
    );
  } catch (err) {
    console.log(err);
    message.reply(
      "❌ O bot não conseguiu aplicar o cargo. Verifique a hierarquia."
    );
  }
});

client.login(TOKEN);
