/**
 * Component render thân bài viết từ kết quả parseBody().
 *
 * Hỗ trợ: heading, bullet (•), paragraph (giữ ngắt dòng bằng \n).
 * Inline `**đậm**` được render chữ đậm.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY } from '@/theme';
import { parseBody, ArticleBlock } from '@/lib/parse-article-body';

interface ArticleBodyProps {
  body: string;
  fontSize?: number;
}

/** Render inline `**text**` → Text với fontWeight bold. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, idx) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <Text key={`${keyPrefix}-${idx}`} style={{ fontWeight: 'bold', fontFamily: FONT_FAMILY.bold }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={`${keyPrefix}-${idx}`}>{part}</Text>;
  });
}

export function ArticleBody({ body, fontSize = 16 }: ArticleBodyProps) {
  const blocks = parseBody(body);

  return (
    <View>
      {blocks.map((block, bIdx) => {
        const key = `block-${bIdx}`;
        if (block.kind === 'heading') {
          return (
            <Text
              key={key}
              style={[
                styles.paragraph,
                styles.heading,
                { fontSize, lineHeight: fontSize * 1.5 },
              ]}
            >
              {renderInline(block.text, key)}
            </Text>
          );
        }

        if (block.kind === 'bullet') {
          return (
            <View key={key} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { fontSize, lineHeight: fontSize * 1.5 }]}>•</Text>
              <Text
                style={[
                  styles.bulletText,
                  { fontSize, lineHeight: fontSize * 1.5 },
                ]}
              >
                {renderInline(block.text, key)}
              </Text>
            </View>
          );
        }

        // paragraph: nối các dòng bằng \n
        return (
          <Text
            key={key}
            style={[styles.paragraph, { fontSize, lineHeight: fontSize * 1.6 }]}
          >
            {renderInline(block.lines.join('\n'), key)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    color: COLORS.textPrimary,
    marginBottom: 14,
    fontFamily: FONT_FAMILY.base,
  },
  heading: {
    fontWeight: 'bold',
    fontFamily: FONT_FAMILY.bold,
    marginTop: 10,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginLeft: 4,
  },
  bulletDot: {
    width: 18,
    color: COLORS.textSecondary,
    fontFamily: FONT_FAMILY.base,
  },
  bulletText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontFamily: FONT_FAMILY.base,
  },
});