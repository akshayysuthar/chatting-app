"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Image as ImageIcon, Settings, Trash2, Info } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useUser, useClerk } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useTheme } from "next-themes";

const ChatCard = ({ chat, onImageChange, onBackgroundChange, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="h-full">
      <CardHeader className="relative">
        <div className="absolute top-2 right-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Chat Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="chatImage" className="text-right">
                    Chat Image
                  </Label>
                  <Input
                    id="chatImage"
                    type="file"
                    accept="image/*"
                    className="col-span-2"
                    onChange={(e) => onImageChange(chat.id, e.target.files[0])}
                  />
                  <Button
                    onClick={() => document.getElementById("chatImage").click()}
                  >
                    Upload
                  </Button>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="chatBackground" className="text-right">
                    Chat Background
                  </Label>
                  <Input
                    id="chatBackground"
                    type="file"
                    accept="image/*"
                    className="col-span-2"
                    onChange={(e) =>
                      onBackgroundChange(chat.id, e.target.files[0])
                    }
                  />
                  <Button
                    onClick={() =>
                      document.getElementById("chatBackground").click()
                    }
                  >
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={chat.image_url} alt={chat.name} />
            <AvatarFallback>{chat.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">{chat.name}</div>
        </div>
        {chat.last_message && (
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>
                {new Date(chat.last_message.created_at).toLocaleString()}
              </span>
            </div>
            <div className="truncate">
              <span className="font-medium">
                {chat.last_message.user_name}:
              </span>
              {chat.last_message.content}
            </div>
          </div>
        )}
        <div className="flex justify-between">
          <Link href={`/chat/${chat.id}`}>
            <Button>Open Chat</Button>
          </Link>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => onDelete(chat.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <Input
          value={chat.invite_link}
          readOnly
          className="text-xs"
          onClick={(e) => e.target.select()}
        />
      </CardContent>
    </Card>
  </motion.div>
);

export default function ChatApp() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [chats, setChats] = useState([]);
  const [newChatName, setNewChatName] = useState("");
  const [lastCommit, setLastCommit] = useState("");
  const [showAppInfo, setShowAppInfo] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isLoaded && user) {
      fetchChats();
    }
  }, [isLoaded, user]);

  useEffect(() => {
    const interval = setInterval(deleteOldMessages, 24 * 60 * 60 * 1000); // Run daily
    return () => clearInterval(interval);
  }, []);

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from("chats")
      .select(
        `
        *,
        last_message: messages (
          content,
          created_at,
          user_name
        )
      `
      )
      .or(
        `user1_email.eq.${user.primaryEmailAddress.emailAddress},user2_email.eq.${user.primaryEmailAddress.emailAddress}`
      )
      .order("created_at", { foreignTable: "messages", ascending: true })
      .limit(1, { foreignTable: "messages" });

    if (error) {
      console.error("Error fetching chats:", error);
    } else {
      setChats(
        data.map((chat) => ({
          ...chat,
          last_message: chat.last_message[0],
        }))
      );
    }
  };

  const fetchLastCommit = async () => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/akshayysuthar/best-chatting-app/commits"
      );
      const commits = await response.json();
      if (commits.length > 0) {
        setLastCommit(commits[0].commit.message);
      }
    } catch (error) {
      console.error("Error fetching last commit:", error);
    }
  };

  const createNewChat = async () => {
    if (!newChatName.trim()) return;

    const { data, error } = await supabase
      .from("chats")
      .insert({
        name: newChatName,
        user1_email: user.primaryEmailAddress.emailAddress,
        invite_link: `${window.location.origin}/invite/${Math.random()
          .toString(36)
          .substring(2, 15)}`,
      })
      .select();

    if (error) {
      console.error("Error creating new chat:", error);
    } else {
      setChats([...chats, data[0]]);
      fetchChats();
      setNewChatName("");
    }
  };

  const handleChatImageChange = async (chatId, file) => {
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${chatId}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file);

    if (error) {
      console.error("Error uploading chat image:", error);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("chats")
      .update({ image_url: publicData.publicUrl })
      .eq("id", chatId);

    if (updateError) {
      console.error("Error updating chat image:", updateError);
    } else {
      fetchChats();
    }
  };

  const handleChatBackgroundChange = async (chatId, file) => {
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${chatId}-bg-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("chat-backgrounds")
      .upload(fileName, file);

    if (error) {
      console.error("Error uploading chat background:", error);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("chat-backgrounds")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("chats")
      .update({ background_url: publicData.publicUrl })
      .eq("id", chatId);

    if (updateError) {
      console.error("Error updating chat background:", updateError);
    } else {
      fetchChats();
    }
  };

  const handleChatDelete = async (chatId) => {
    const { error } = await supabase.from("chats").delete().eq("id", chatId);

    if (error) {
      console.error("Error deleting chat:", error);
    } else {
      setChats(chats.filter((chat) => chat.id !== chatId));
    }
  };

  const deleteOldMessages = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { error } = await supabase
      .from("messages")
      .delete()
      .lt("created_at", oneWeekAgo.toISOString());

    if (error) {
      console.error("Error deleting old messages:", error);
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Button size="lg" asChild>
          <Link href="/sign-in">Sign in to join the chat</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} signOut={signOut} />

      <main className="flex-1 container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Welcome, {user.fullName}!</h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Create New Chat</h2>
          <div className="flex gap-2">
            <Input
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              placeholder="Enter chat name"
              className="flex-1"
            />
            <Button onClick={createNewChat}>
              <Plus className="mr-2 h-4 w-4" /> Create Chat
            </Button>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Your Chats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {chats.map((chat) => (
              <ChatCard
                key={chat.id}
                chat={chat}
                onImageChange={handleChatImageChange}
                onBackgroundChange={handleChatBackgroundChange}
                onDelete={handleChatDelete}
              />
            ))}
          </AnimatePresence>
        </div>

        {lastCommit && (
          <div className="mt-8 text-sm text-muted-foreground">
            Last update: {lastCommit}
          </div>
        )}
      </main>

      <Dialog open={showAppInfo} onOpenChange={setShowAppInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to LiveChat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              LiveChat is a free, end-to-end encrypted messaging app designed
              for easy and secure communication.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>End-to-end encryption for your privacy</li>
              <li>Image upload support</li>
              <li>User-friendly interface</li>
              <li>Create multiple chat rooms</li>
              <li>Customizable chat backgrounds</li>
              <li>Auto-deletion of week-old messages to save space</li>
            </ul>
            <p>
              Get started by creating a new chat or joining an existing one!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
