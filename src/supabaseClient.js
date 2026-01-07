import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iivlxixcmlrqwdhewbuz.supabase.co'
const supabaseAnonKey = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7'

// Создаем и экспортируем клиент
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Функция для загрузки видео с привязкой к папке пользователя
export const uploadVideo = async (file, userId = 'anonymous') => {
    // 1. Проверка расширения
    const fileExt = file.name.split('.').pop();
    
    // 2. Создаем уникальный путь: folder/имя_файла
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
  
    // 3. Загружаем файл в бакет 'videos'
    let { error: uploadError, data: uploadData } = await supabase.storage
      .from('videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
  
    if (uploadError) {
      console.error('Upload Error:', uploadError);
      throw uploadError;
    }
  
    // 4. Получаем публичную ссылку
    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);
  
    return data.publicUrl;
};