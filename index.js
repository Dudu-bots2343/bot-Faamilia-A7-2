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

    if (cargo.position >= autor.roles.highest.position) return false;
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
    // ADDCARGO
    // ===========================
    if (cmd === "addcargo") {
        const { cargo, usuario } = extractTargets(message, args);

        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Use: `!addcargo @cargo @pessoa` ou variações.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        if (!canModify(message, cargo, usuario)) {
            const erro = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Você **não pode setar esse cargo**.\nCargo igual/maior que o seu ou usuário com cargo maior.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        await usuario.roles.add(cargo).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("Família A7")
            .setColor("#00ff99")
            .setThumbnail("https://cdn.discordapp.com/icons/" + message.guild.id + "/" + message.guild.icon + ".png")
            .addFields(
                { name: "Cargo:", value: `${cargo} \n(${cargo.id})`, inline: false },
                { name: "Cargo setado com sucesso no:", value: `${usuario.user.username}_${usuario.user.discriminator}`, inline: false },
                { name: "Quem setou:", value: `${message.author}`, inline: false }
            );

        return message.channel.send({ embeds: [embed] });
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
                .setDescription("Use: `!removercargo @cargo @pessoa` ou variações.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        if (!canModify(message, cargo, usuario)) {
            const erro = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Você **não pode remover esse cargo**.\nCargo igual/maior que o seu ou usuário com cargo maior.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        await usuario.roles.remove(cargo).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("Família A7")
            .setColor("#ff4444")
            .setThumbnail("https://cdn.discordapp.com/icons/" + message.guild.id + "/" + message.guild.icon + ".png")
            .addFields(
                { name: "Cargo Removido:", value: `${cargo} \n(${cargo.id})`, inline: false },
                { name: "Cargo removido do:", value: `${usuario}`, inline: false },
                { name: "Quem removeu:", value: `${message.author}`, inline: false }
            );

        return message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
