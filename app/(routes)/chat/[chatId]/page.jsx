"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Message from "@/components/Message";
import { supabase } from "@/utils/supabase";
import Navbar from "@/components/Navbar";
import { useTheme } from "next-themes";

const SkeletonLoading = () => (
  <div className="animate-pulse flex flex-col space-y-4 mt-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center space-x-2">
        <div className="rounded-full bg-muted h-10 w-10"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function ChatPage({ params }) {
  const { user, isLoaded } = useUser();
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [chatName, setChatName] = useState("");
  const messagesEndRef = useRef(null);

  const deleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== messageId)
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", params.chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [params.chatId]);

  const fetchChatDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select("name, background_url")
        .eq("id", params.chatId)
        .single();

      if (error) throw error;
      setChatName(data.name);
      setBackgroundImage(data.background_url);
    } catch (error) {
      console.error("Error fetching chat details:", error);
    }
  }, [params.chatId]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchMessages();
      fetchChatDetails();
      const channel = supabase.channel("public:messages");
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            setMessages((currentMessages) => [...currentMessages, payload.new]);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("Subscribed to real-time messages");
          }
        });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isLoaded, user, fetchMessages, fetchChatDetails]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file);

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    const { data: publicData, error: publicURLError } = supabase.storage
      .from("chat-images")
      .getPublicUrl(fileName);

    if (publicURLError) {
      console.error("Error getting public URL:", publicURLError);
      return null;
    }

    console.log("Public URL:", publicData.publicUrl);
    return publicData.publicUrl;
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && !imageFile) return;
    if (!user) return;

    let imageUrl = null;

    if (imageFile) {
      imageUrl = await handleImageUpload(imageFile);
      setImageFile(null);

      if (!imageUrl) {
        console.error("Failed to upload image or retrieve public URL.");
        return;
      }
    }

    try {
      const { data, error } = await supabase.from("messages").insert([
        {
          content: newMessage,
          chat_id: params.chatId,
          user_name: user.fullName,
          user_email: user.primaryEmailAddress.emailAddress,
          user_avatar: user.imageUrl,
          image_url: imageUrl,
        },
      ]);

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleBackgroundChange = async (file) => {
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${params.chatId}-bg-${Date.now()}.${fileExt}`;

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

    setBackgroundImage(publicData.publicUrl);

    const { error: updateError } = await supabase
      .from("chats")
      .update({ background_url: publicData.publicUrl })
      .eq("id", params.chatId);

    if (updateError) {
      console.error("Error updating chat background:", updateError);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setNewMessage("");
      sendMessage(e);
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
    <div className="flex flex-col h-screen">
      <Navbar
        user={user}
        chatName={chatName}
        onBackgroundChange={handleBackgroundChange}
      />
      <div className="flex-1 flex flex-col">
        <div
          className="flex-1 overflow-y-auto p-4 bg-background text-foreground"
          style={
            backgroundImage
              ? {
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}
          }
        >
          {loading ? (
            <SkeletonLoading />
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isOwnMessage={
                    message.user_email === user.primaryEmailAddress.emailAddress
                  }
                  deleteMessage={deleteMessage}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={sendMessage}
        className="bg-background border-t border-border p-4"
      >
        <div className="flex space-x-4 items-center">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="rounded-lg flex-1"
          />

          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="bg-secondary rounded-lg px-4 py-2 flex items-center justify-center cursor-pointer">
              <span className="text-foreground pr-1">Send</span>
              <ImageIcon className="w-5 h-5 text-foreground" />
            </div>
          </div>

          <Button
            type="submit"
            size="icon"
            className="rounded-full text-primary bg-secondary"
          >
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
      </form>
    </div>
  );
}
