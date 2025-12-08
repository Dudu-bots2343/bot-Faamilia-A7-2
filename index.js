// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();

// Página inicial para o UptimeRobot pingar
app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));

app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));

// ====================== DOTENV ==========================
require("dotenv").config();

// ====================== DISCORD.JS ======================
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
  console.log(`🤖 Bot ligado como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Família Do7 ")
    .setDescription(
      "Registro A7.\n\n Solicite SET usando o botão abaixo.\nPreencha com atenção!"
    )
    .addFields({
      name: "📌 Lembretes",
      value: `• A resenha aqui é garantida.\n• Não leve tudo a sério.`,
    })
    .setColor("#f1c40f");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirRegistro")
      .setLabel("Registro")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [btn] });

  console.log("📩 Mensagem de registro enviada!");
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
    .setLabel("Seu nome*")
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

// =================== APROVAR / NEGAR ===================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);

  const embedOriginal = interaction.message.embeds[0];

  const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
  const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

  // ========== APROVAR ==========
  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);

      await membro.roles.add([
        CARGO_APROVADO,
        CARGO_APROVADO_2,
      ]);

      // ======= MENSAGEM DE BOAS-VINDAS =======
      const mensagem = `
<a:coroa4:1425236745762504768> **Seja Muito Bem-vindo à Family Do7 ** <:emojia7:1429141492080967730>

** Parabéns! Agora vc e um membro oficial da Family Do7 , Seu set foi aceito , um lugar onde a vibe é diferente,
A resenha aqui e 24 horas por dia, a energia é única e cada pessoa soma do seu próprio jeito... **

✨ **Seja muito bem-vindo!** ✨
`;

      await membro.send(mensagem).catch(() => {});

      const embedAprovado = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Registro Aprovado")
        .addFields(
          { name: "👤 Usuário:", value: `${membro}` },
          { name: "🪪 ID:", value: `${idInformado}` },
          { name: "📛 Nome Informado:", value: `A7 ${nomeInformado}` },
          { name: "🧭 Acesso aprovado por:", value: `${interaction.user}` }
        )
        .setThumbnail(membro.user.displayAvatarURL())
        .setFooter({ text: "Aprovado com sucesso!" });

      await interaction.update({
        embeds: [embedAprovado],
        components: []
      });

    } catch (e) {
      console.log(e);
      return interaction.reply({
        content: "❌ Erro ao aprovar. Verifique permissões.",
        ephemeral: true
      });
    }
  }

  // ========== NEGAR ==========
  if (acao === "negar") {
    try {
      await membro.kick("Registro negado pelo aprovador.");

      const embedNegado = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Registro Negado")
        .setDescription(`❌ O usuário **${membro.user.tag}** foi expulso.\nNegado por: ${interaction.user}`)
        .setThumbnail(membro.user.displayAvatarURL());

      await interaction.update({
        embeds: [embedNegado],
        components: []
      });

    } catch (e) {
      console.log(e);
      return interaction.reply({
        content: "❌ Não consegui expulsar o usuário.",
        ephemeral: true
      });
    }
  }
});
// =================== ENVIAR MENSAGEM PARA TODOS OS MEMBROS ===================
// Uso:  !pvall mensagem aqui
// Ele envia no PV de todos os membros do servidor

client.on("messageCreate", async (message) => {

    if (!message.content.startsWith("!pvall")) return;
    if (!message.member.permissions.has("Administrator")) 
        return message.reply("❌ Você não tem permissão para usar este comando!");

    const texto = message.content.split(" ").slice(1).join(" ");
    if (!texto) return message.reply("⚠️ Escreva uma mensagem para enviar!");

    const members = await message.guild.members.fetch();
    
    message.reply(`📨 Enviando mensagem para **${members.size} membros**... Pode levar um tempo.`);

    let enviados = 0;
    let falhou = 0;

    members.forEach(m => {
        if (m.user.bot) return; // Ignora bots
        
        m.send(`📩 **Familia A7 :**\n${texto}`)
            .then(() => enviados++)
            .catch(() => falhou++);
    });

    setTimeout(() => {
        message.channel.send(`✔️ Mensagens enviadas com sucesso para **${enviados} membros**.\n⚠️ Falhou em **${falhou} membros** (DM fechada).`);
    }, 5000);
});

client.login(TOKEN);





