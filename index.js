const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.on("ready", () => {
    console.log(`Bot online como ${client.user.tag}`);
});

// Função para extrair cargo e usuário de várias formas
function extractTargets(message, args) {
    let cargo =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[0]);

    let usuario =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[1]);

    return { cargo, usuario };
}

// Função para checar hierarquia
function canModify(message, cargo, usuario) {
    const autor = message.member;

    if (!cargo || !usuario) return false;

    // Autor NÃO pode setar cargo igual ou maior que o dele
    if (cargo.position >= autor.roles.highest.position) return false;

    // Autor NÃO pode modificar usuário com cargo igual ou maior
    if (usuario.roles.highest.position >= autor.roles.highest.position) return false;

    return true;
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    // ===========================
    //  ADDCARGO
    // ===========================
    if (cmd === "addcargo") {
        const { cargo, usuario } = extractTargets(message, args);

        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Formato inválido.\nUse: `!addcargo @cargo @pessoa` ou variações.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        // HIERARQUIA
        if (!canModify(message, cargo, usuario)) {
            const hierarquia = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Você **não pode setar esse cargo**.\nEle é igual ou maior que o seu, ou a pessoa tem cargo maior/equal ao seu.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [hierarquia] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        await usuario.roles.add(cargo).catch(() => {});

        const ok = new EmbedBuilder()
            .setTitle("✅ Cargo Setado")
            .setDescription(`O cargo **${cargo.name}** foi adicionado ao usuário **${usuario.user.tag}**.`)
            .setColor("#00ff99")
            .setThumbnail(message.guild.iconURL());

        return message.channel.send({ embeds: [ok] }).then(msg => {
            setTimeout(() => msg.delete().catch(()=>{}), 20000);
        });
    }

    // ===========================
    // REMOVERCARGO
    // ===========================
    if (cmd === "removercargo") {
        const { cargo, usuario } = extractTargets(message, args);

        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Formato inválido.\nUse: `!removercargo @cargo @pessoa` ou variações.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        // HIERARQUIA
        if (!canModify(message, cargo, usuario)) {
            const hierarquia = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Você **não pode remover esse cargo**.\nEle é igual ou maior que o seu, ou a pessoa tem cargo maior/iqual ao seu.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [hierarquia] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        await usuario.roles.remove(cargo).catch(() => {});

        const ok = new EmbedBuilder()
            .setTitle("🗑️ Cargo Removido")
            .setDescription(`O cargo **${cargo.name}** foi removido do usuário **${usuario.user.tag}**.`)
            .setColor("#ff4444")
            .setThumbnail(message.guild.iconURL());

        return message.channel.send({ embeds: [ok] }).then(msg => {
            setTimeout(() => msg.delete().catch(()=>{}), 20000);
        });
    }
});

client.login(process.env.TOKEN);

