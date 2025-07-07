import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Shield, User, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (username: string, isAdmin: boolean) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && selectedRole) {
      onLogin(username.trim(), selectedRole === 'admin');
    }
  };

  const handleQuickLogin = (role: 'user' | 'admin', name?: string) => {
    const finalName = name || (role === 'admin' ? 'admin' : `User${Math.floor(Math.random() * 1000)}`);
    onLogin(finalName, role === 'admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="text-white text-2xl" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Live-Chat</h1>
              <p className="text-gray-600">Choose your access level to continue</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="rounded-xl"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Access Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedRole === 'user'
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRole('user')}
                  >
                    <div className="text-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="text-white text-lg" />
                      </div>
                      <h3 className="font-medium text-gray-800">User</h3>
                      <p className="text-xs text-gray-600 mt-1">Chat with admin</p>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedRole === 'admin'
                        ? 'border-purple-300 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRole('admin')}
                  >
                    <div className="text-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Shield className="text-white text-lg" />
                      </div>
                      <h3 className="font-medium text-gray-800">Admin</h3>
                      <p className="text-xs text-gray-600 mt-1">Manage users</p>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={!username.trim() || !selectedRole}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl"
              >
                {selectedRole === 'admin' ? 'Access Admin Dashboard' : 'Start Chatting'}
              </Button>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or quick access</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  onClick={() => handleQuickLogin('user')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Join as User
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  onClick={() => handleQuickLogin('admin')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Access
                </Button>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Access Levels:</h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start space-x-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">User</Badge>
                  <span>Chat privately with admin only. No access to other users.</span>
                </div>
                {/* <div className="flex items-start space-x-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">Admin</Badge>
                  <span>View all user conversations, manage multiple chats, see online users.</span>
                </div> */}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}