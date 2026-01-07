import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iivlxixcmlrqwdhewbuz.supabase.co'
const supabaseAnonKey = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Функция для загрузки видео с привязкой к папке пользователя
export const uploadVideo = async (file, userId = 'anonymous') => {
    const fileExt = file.name.split('.').pop();
    // Создаем путь: folder/имя_файла для порядка в хранилище
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
  
    // Загружаем файл в бакет 'videos'
    let { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Не перезаписывать существующие
      });
  
    if (uploadError) {
      throw uploadError;
    }
  
    // Получаем публичную ссылку
    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);
  
    return data.publicUrl;
};