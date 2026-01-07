import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iivlxixcmlrqwdhewbuz.supabase.co'
const supabaseAnonKey = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// Функция для загрузки видео в Supabase Storage
export const uploadVideo = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`; // Создаем уникальное имя
    const filePath = `${fileName}`;
  
    // Загружаем файл в бакет 'videos'
    let { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file);
  
    if (uploadError) {
      throw uploadError;
    }
  
    // Получаем публичную ссылку на файл
    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);
  
    return data.publicUrl;
  };