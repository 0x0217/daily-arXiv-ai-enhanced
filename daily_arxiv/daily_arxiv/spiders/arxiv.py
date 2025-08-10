import scrapy
import os
import re


class ArxivSpider(scrapy.Spider):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        categories = os.environ.get("CATEGORIES", "cs.CV")
        categories = categories.split(",")
        # 保存目标分类列表，用于后续验证
        self.target_categories = set(map(str.strip, categories))

        # 获取包含和排除关键词
        include_keywords = os.environ.get("INCLUDE_KEYWORDS", "")
        exclude_keywords = os.environ.get("EXCLUDE_KEYWORDS", "")

        self.include_keywords = [kw.strip().lower() for kw in include_keywords.split(",") if kw.strip()]
        self.exclude_keywords = [kw.strip().lower() for kw in exclude_keywords.split(",") if kw.strip()]

        self.logger.info(f"Target categories: {self.target_categories}")
        self.logger.info(f"Include keywords: {self.include_keywords}")
        self.logger.info(f"Exclude keywords: {self.exclude_keywords}")

        self.start_urls = [
            f"https://arxiv.org/list/{cat}/new" for cat in self.target_categories
        ]  # 起始URL（计算机科学领域的最新论文）

    name = "arxiv"  # 爬虫名称
    allowed_domains = ["arxiv.org"]  # 允许爬取的域名

    def parse(self, response):
        # 提取每篇论文的信息
        anchors = []
        for li in response.css("div[id=dlpage] ul li"):
            href = li.css("a::attr(href)").get()
            if href and "item" in href:
                anchors.append(int(href.split("item")[-1]))

        # 遍历每篇论文的详细信息
        for paper in response.css("dl dt"):
            paper_anchor = paper.css("a[name^='item']::attr(name)").get()
            if not paper_anchor:
                continue

            paper_id = int(paper_anchor.split("item")[-1])
            if anchors and paper_id >= anchors[-1]:
                continue

            # 获取论文ID
            abstract_link = paper.css("a[title='Abstract']::attr(href)").get()
            if not abstract_link:
                continue

            arxiv_id = abstract_link.split("/")[-1]

            # 获取对应的论文描述部分 (dd元素)
            paper_dd = paper.xpath("following-sibling::dd[1]")
            if not paper_dd:
                continue

            # 提取论文分类信息 - 在subjects部分
            subjects_text = paper_dd.css(".list-subjects .primary-subject::text").get()
            if not subjects_text:
                # 如果找不到主分类，尝试其他方式获取分类
                subjects_text = paper_dd.css(".list-subjects::text").get()

            if subjects_text:
                # 解析分类信息，通常格式如 "Computer Vision and Pattern Recognition (cs.CV)"
                # 提取括号中的分类代码
                categories_in_paper = re.findall(r'\(([^)]+)\)', subjects_text)

                # 检查论文分类是否与目标分类有交集
                paper_categories = set(categories_in_paper)
                if paper_categories.intersection(self.target_categories):
                    # 提取标题和摘要用于关键词过滤
                    title = paper_dd.css(".list-title")
                    title_text = ""
                    if title:
                        # 移除 "Title:" 前缀并清理文本
                        title_text = title.css("::text").getall()
                        title_text = "".join(title_text).replace("Title:", "").strip()

                    # 提取摘要
                    abstract = paper_dd.css(".mathjax")
                    abstract_text = ""
                    if abstract:
                        abstract_text = "".join(abstract.css("::text").getall()).strip()

                    # 应用关键词过滤
                    if self._should_include_paper(title_text, abstract_text, arxiv_id):
                        yield {
                            "id": arxiv_id,
                            "categories": list(paper_categories),  # 添加分类信息用于调试
                        }
                        self.logger.info(f"Found paper {arxiv_id} with categories {paper_categories}")
                    else:
                        self.logger.debug(f"Skipped paper {arxiv_id} due to keyword filtering")
                else:
                    self.logger.debug(f"Skipped paper {arxiv_id} with categories {paper_categories} (not in target {self.target_categories})")
            else:
                # 如果无法获取分类信息，记录警告但仍然返回论文（保持向后兼容）
                self.logger.warning(f"Could not extract categories for paper {arxiv_id}, including anyway")
                # 对于无分类信息的论文，如果有关键词过滤则跳过
                if self.include_keywords or self.exclude_keywords:
                    self.logger.debug(f"Skipped paper {arxiv_id} without categories when keyword filtering is enabled")
                else:
                    yield {
                        "id": arxiv_id,
                        "categories": [],
                    }

    def _should_include_paper(self, title, abstract, arxiv_id):
        """
        检查论文是否应该包含基于关键词过滤

        Args:
            title: 论文标题
            abstract: 论文摘要
            arxiv_id: 论文ID (用于日志)

        Returns:
            bool: True 如果应该包含论文, False 否则
        """
        # 如果没有设置任何关键词过滤，则包含所有论文
        if not self.include_keywords and not self.exclude_keywords:
            return True

        # 合并标题和摘要进行搜索
        search_text = f"{title} {abstract}".lower()

        # 检查排除关键词 - 如果匹配任何排除关键词则跳过
        if self.exclude_keywords:
            for exclude_kw in self.exclude_keywords:
                if exclude_kw in search_text:
                    self.logger.debug(f"Paper {arxiv_id} excluded due to keyword: {exclude_kw}")
                    return False

        # 检查包含关键词 - 如果设置了包含关键词，必须匹配至少一个
        if self.include_keywords:
            for include_kw in self.include_keywords:
                if include_kw in search_text:
                    self.logger.debug(f"Paper {arxiv_id} included due to keyword: {include_kw}")
                    return True
            # 如果设置了包含关键词但没有匹配到任何一个，则排除
            self.logger.debug(f"Paper {arxiv_id} excluded - no include keywords matched")
            return False

        # 如果只设置了排除关键词而没有包含关键词，且没被排除，则包含
        return True
